<template>
  <div class="h-[80vh] flex flex-col">
    <!-- Main Content Area -->
    <div class="flex-1 overflow-y-auto">
      <div class="flex flex-col gap-4 pb-4">
          <!-- Cost Code Configuration Card -->
          <UCard variant="soft">
            <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              <UIcon name="i-heroicons-cog-6-tooth-solid" class="w-5 h-5 text-brand-600 dark:text-brand-400" />
              Cost Code Configuration
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <!-- Corporation -->
              <div class="col-span-2">
                <label class="block text-xs font-medium text-default mb-1">
                  Corporation <span class="text-red-500">*</span>
                </label>
                <CorporationSelect
                  :model-value="form.corporation_uuid"
                  placeholder="Select corporation"
                  size="sm"
                  class="w-full"
                  @update:model-value="(value) => handleFormUpdate('corporation_uuid', value)"
                  @change="handleCorporationChange"
                />
              </div>

              <!-- Division -->
              <div>
                <label class="block text-xs font-medium text-default mb-1">
                  Division
                </label>
                <DivisionSelect
                  :model-value="form.division_uuid"
                  :corporation-uuid="form.corporation_uuid"
                  :local-divisions="localDivisions"
                  placeholder="Select Division"
                  size="sm"
                  class="w-full"
                  @update:model-value="(value) => handleFormUpdate('division_uuid', value)"
                  @change="handleDivisionChange"
                />
              </div>

              <!-- Cost Code Number -->
              <div>
                <label class="block text-xs font-medium text-default mb-1">
                  Cost Code Number <span class="text-red-500">*</span>
                </label>
                <UInput
                  v-model="form.cost_code_number"
                  placeholder="e.g., 01 02 03.15"
                  size="sm"
                  class="w-full"
                  @update:model-value="(value) => handleFormUpdate('cost_code_number', value)"
                />
              </div>

              <!-- Cost Code Name -->
              <div class="col-span-2">
                <label class="block text-xs font-medium text-default mb-1">
                  Cost Code Name <span class="text-red-500">*</span>
                </label>
                <UInput
                  v-model="form.cost_code_name"
                  placeholder="Enter cost code name"
                  size="sm"
                  class="w-full"
                  @update:model-value="(value) => handleFormUpdate('cost_code_name', value)"
                />
              </div>

              <!-- Sub Category of -->
              <div>
                <label class="block text-xs font-medium text-default mb-1">
                  Sub Category of
                </label>
                <ParentCostCodeSelect
                  :model-value="form.parent_cost_code_uuid"
                  :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
                  :exclude-uuid="props.form.id || props.form.uuid"
                  :division-uuid="form.division_uuid"
                  :local-configurations="localConfigurations"
                  placeholder="Search cost codes..."
                  searchable-placeholder="Type to search..."
                  size="sm"
                  class="w-full"
                  @update:model-value="(value) => handleParentCostCodeChange(value)"
                />
              </div>

              <!-- Order -->
              <div>
                <label class="block text-xs font-medium text-default mb-1">
                  Order
                  <span v-if="lastUsedOrderNumber" class="text-gray-500 font-normal ml-1">
                    (Recent highest: {{ lastUsedOrderNumber }})
                  </span>
                </label>
                <OrderSelect
                  :model-value="form.order"
                  placeholder="Select"
                  size="sm"
                  @change="(value) => handleFormUpdate('order', value)"
                />
              </div>

              <!-- Preferred Vendor -->
              <div>
                <label class="block text-xs font-medium text-default mb-1">
                  Preferred Vendor
                </label>
                <div class="flex items-stretch gap-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-colors">
                  <VendorSelect
                    :model-value="form.preferred_vendor_uuid"
                    placeholder="Select Vendor"
                    size="sm"
                    :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
                    :local-vendors="localVendors"
                    class="flex-1 border-0 rounded-none bg-transparent [&>button]:border-0 [&>button]:rounded-none [&>button]:bg-transparent"
                    @change="(vendor) => handleVendorChange(vendor)"
                  />
                  <UButton
                    icon="i-heroicons-plus"
                    size="xs"
                    color="primary"
                    variant="soft"
                    class="shrink-0 rounded-none border-l border-gray-300 dark:border-gray-600 h-auto m-0"
                    :disabled="!form.corporation_uuid && !corpStore.selectedCorporation"
                    @click="openVendorModal"
                    title="Add new vendor"
                  />
                </div>
              </div>

              <!-- GL Account -->
              <div class="col-span-2">
                <label class="block text-xs font-medium text-default mb-1">
                  GL Account <span class="text-red-500">*</span>
                </label>
                <ChartOfAccountsSelect
                  :model-value="form.gl_account_uuid"
                  :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
                  :local-accounts="localChartOfAccounts"
                  :disabled="!form.corporation_uuid && !corpStore.selectedCorporation"
                  :placeholder="!form.corporation_uuid && !corpStore.selectedCorporation ? 'Select corporation first' : 'Select GL Account'"
                  size="sm"
                  class="w-full"
                  @change="(account) => handleGLAccountChange(account)"
                />
              </div>

              <!-- Update previous transactions -->
              <div class="flex items-center">
                <UCheckbox
                  v-model="form.update_previous_transactions"
                  label="Update previous transactions"
                  class="text-sm"
                  @update:model-value="(value) => handleFormUpdate('update_previous_transactions', value)"
                />
              </div>

              <!-- Effective from (only shown when update_previous_transactions is checked) -->
              <div v-if="form.update_previous_transactions">
                <label class="block text-xs font-medium text-default mb-1">
                  Effective from
                </label>
                <UPopover v-model:open="effectiveDatePopoverOpen">
                  <UButton 
                    color="neutral" 
                    variant="outline" 
                    icon="i-heroicons-calendar-days"
                    class="w-full justify-start"
                    size="sm"
                  >
                    {{ effectiveDateDisplayText }}
                  </UButton>
                  <template #content>
                    <UCalendar v-model="effectiveDateValue" class="p-2" @update:model-value="effectiveDatePopoverOpen = false" />
                  </template>
                </UPopover>
              </div>

              <!-- Description -->
              <div class="col-span-2">
                <label class="block text-xs font-medium text-default mb-1">
                  Description
                </label>
                <UTextarea
                  v-model="form.description"
                  placeholder="Enter description"
                  size="sm"
                  class="w-full"
                  :rows="3"
                  @update:model-value="(value) => handleFormUpdate('description', value)"
                />
              </div>

              <!-- Active Status -->
              <div class="flex items-center">
                <UCheckbox
                  v-model="form.is_active"
                  label="Active"
                  class="text-sm"
                  @update:model-value="(value) => handleFormUpdate('is_active', value)"
                />
              </div>
            </div>
          </UCard>

          <!-- Preferred Items Section -->
          <UCard variant="soft">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                <UIcon name="i-heroicons-cube-solid" class="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Preferred Items to the Cost Code
              </h4>
              <UButton
                icon="i-heroicons-plus"
                size="xs"
                color="primary"
                @click="openItemModal"
              >
                Add Item
              </UButton>
            </div>

            <!-- Items Table -->
            <div v-if="form.preferred_items && form.preferred_items.length > 0" class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="text-left py-2 px-2 font-medium text-default">
                      <UCheckbox />
                    </th>
                    <th class="text-left py-2 px-2 font-medium text-default">Item Sequence</th>
                    <th class="text-left py-2 px-2 font-medium text-default">Item Name</th>
                    <th class="text-left py-2 px-2 font-medium text-default">Item Type</th>
                    <th class="text-left py-2 px-2 font-medium text-default">Project</th>
                    <th class="text-left py-2 px-2 font-medium text-default">Unit Price</th>
                    <th class="text-left py-2 px-2 font-medium text-default">UOM</th>
                    <th class="text-left py-2 px-2 font-medium text-default">Description</th>
                    <th class="text-left py-2 px-2 font-medium text-default">Status</th>
                    <th class="text-center py-2 px-2 font-medium text-default">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(item, index) in form.preferred_items" 
                    :key="index"
                    class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td class="py-2 px-2">
                      <UCheckbox />
                    </td>
                    <td class="py-2 px-2 text-default font-mono">{{ item.item_sequence || '-' }}</td>
                    <td class="py-2 px-2 text-default">{{ item.item_name }}</td>
                    <td class="py-2 px-2 text-default">{{ getItemTypeName(item.item_type_uuid) }}</td>
                    <td class="py-2 px-2 text-default">{{ getProjectName(item.project_uuid) }}</td>
                    <td class="py-2 px-2 text-default">{{ item.unit_price }}</td>
                    <td class="py-2 px-2 text-default">{{ item.unit }}</td>
                    <td class="py-2 px-2 text-muted">{{ item.description }}</td>
                    <td class="py-2 px-2">
                      <UBadge 
                        :color="item.status === 'Active' ? 'success' : 'error'" 
                        size="xs"
                        variant="soft"
                      >
                        {{ item.status }}
                      </UBadge>
                    </td>
                    <td class="py-2 px-2 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <UButton
                          icon="i-heroicons-plus"
                          size="xs"
                          color="primary"
                          variant="solid"
                          class="p-1 h-6 w-6"
                          @click="openItemModal"
                          title="Add new item"
                        />
                        <UButton
                          icon="tdesign:edit-filled"
                          size="xs"
                          color="secondary"
                          variant="soft"
                          class="p-1 h-6 w-6"
                          @click="editItem(index)"
                          title="Edit item"
                        />
                        <UButton
                          icon="mingcute:delete-fill"
                          size="xs"
                          variant="soft"
                          color="error"
                          class="p-1 h-6 w-6"
                          @click="deleteItem(index)"
                          title="Delete item"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- No items message -->
            <div v-else class="flex flex-col items-center justify-center text-muted p-8">
              <UIcon name="i-heroicons-cube" class="w-12 h-12 mb-3 text-muted" />
              <p class="text-sm font-medium mb-1">No items added</p>
              <p class="text-xs text-muted text-center">
                Click "Add Item" to add preferred items to this cost code
              </p>
            </div>
          </UCard>
        </div>
      </div>

    <!-- Add/Edit Item Modal -->
    <UModal v-model:open="showItemModal">
      <template #header>
        <h3 class="text-base font-semibold">{{ editingItemIndex !== null ? 'Edit Item' : 'Add Item' }}</h3>
      </template>
      <template #body>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Item Sequence <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="itemForm.item_sequence"
              placeholder="Enter item sequence (e.g., A-123, SEQ-01)"
              size="sm"
              class="w-full"
            />
            <p class="text-xs text-gray-500 mt-1">Alphanumeric identifier (letters, numbers, and symbols like -)</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Item Name <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="itemForm.item_name"
              placeholder="Enter item name"
              size="sm"
              class="w-full"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Item Type <span class="text-red-500">*</span>
            </label>
            <ItemTypeSelect
              :model-value="itemForm.item_type_uuid"
              placeholder="Select item type"
              size="sm"
              :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
              @change="(itemType) => handleItemTypeChange(itemType)"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Project <span class="text-red-500">*</span>
            </label>
            <ProjectSelect
              :model-value="itemForm.project_uuid"
              placeholder="Select project"
              size="sm"
              :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
              @change="(project) => handleProjectChange(project)"
            />
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Unit Price <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <UInput
                  v-model="itemForm.unit_price"
                  type="number"
                  step="1"
                  placeholder="0.00"
                  size="sm"
                  class="w-full pl-6"
                  @keypress="(e: KeyboardEvent) => { if (e.key && !/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab' && e.key !== 'Enter') e.preventDefault(); }"
                />
                <span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium pointer-events-none">
                  {{ currencySymbol }}
                </span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                UOM (Unit of Measurement) <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                :model-value="uomOptions.find(u => u.value === itemForm.unit)"
                :items="uomOptions"
                placeholder="Select UOM"
                size="sm"
                searchable
                class="w-full"
                @update:model-value="(selected) => itemForm.unit = selected?.value || ''"
              >
                <template #item-label="{ item }">
                  <div class="flex items-center gap-2">
                    <span class="text-muted">{{ item.short_name }}</span>
                    <span class="text-muted">-</span>
                    <span class="font-semibold text-default">{{ item.full_name }}</span>
                  </div>
                </template>
              </USelectMenu>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Description
            </label>
            <UTextarea
              v-model="itemForm.description"
              placeholder="Enter description"
              size="sm"
              :rows="2"
              class="w-full"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Status
            </label>
            <USelect
              v-model="itemForm.status"
              :items="[{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }]"
              size="sm"
              value-attribute="value"
              option-attribute="label"
              class="w-full"
            />
          </div>

          <!-- Inventory Management Fields -->
          <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
            <h4 class="text-sm font-semibold text-default mb-3 flex items-center gap-2">
              <UIcon name="i-heroicons-cube-solid" class="w-4 h-4 text-brand-600" />
              Inventory Management
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-default mb-1">
                  Initial Quantity
                </label>
                <UInput
                  v-model="itemForm.initial_quantity"
                  type="number"
                  step="1"
                  placeholder="0.00"
                  size="sm"
                  class="w-full"
                  @keypress="(e: KeyboardEvent) => { if (e.key && !/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab' && e.key !== 'Enter') e.preventDefault(); }"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-default mb-1">
                  As of Date
                </label>
                <UPopover v-model:open="itemAsOfDatePopoverOpen">
                  <UButton 
                    color="neutral" 
                    variant="outline" 
                    icon="i-heroicons-calendar-days"
                    class="w-full justify-start"
                    size="sm"
                  >
                    {{ itemAsOfDateDisplayText }}
                  </UButton>
                  <template #content>
                    <UCalendar 
                      v-model="itemAsOfDateValue" 
                      class="p-2" 
                      @update:model-value="itemAsOfDatePopoverOpen = false"
                    />
                  </template>
                </UPopover>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label class="block text-sm font-medium text-default mb-1">
                  Reorder Point
                </label>
                <UInput
                  v-model="itemForm.reorder_point"
                  type="number"
                  step="1"
                  placeholder="0.00"
                  size="sm"
                  class="w-full"
                  @keypress="(e: KeyboardEvent) => { if (e.key && !/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab' && e.key !== 'Enter') e.preventDefault(); }"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-default mb-1">
                  Maximum Limit
                </label>
                <UInput
                  v-model="itemForm.maximum_limit"
                  type="number"
                  step="1"
                  placeholder="0.00"
                  size="sm"
                  class="w-full"
                  @keypress="(e: KeyboardEvent) => { if (e.key && !/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab' && e.key !== 'Enter') e.preventDefault(); }"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="soft" @click="closeItemModal">
            Cancel
          </UButton>
          <UButton color="primary" @click="saveItem">
            {{ editingItemIndex !== null ? 'Update' : 'Add' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Vendor Form Modal -->
    <VendorForm 
      v-model="showVendorModal" 
      :vendor="null"
      @vendor-saved="handleVendorSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated, onUnmounted } from 'vue';
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date';
import { useCorporationStore } from '@/stores/corporations';
import { useCostCodeDivisionsStore } from '@/stores/costCodeDivisions';
import { useChartOfAccountsStore } from '@/stores/chartOfAccounts';
import { useVendorStore } from '@/stores/vendors';
import { useUOMStore } from '@/stores/uom';
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations';
import { useItemTypesStore } from '@/stores/itemTypes';
import { useProjectsStore } from '@/stores/projects';
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';
import ChartOfAccountsSelect from '@/components/Shared/ChartOfAccountsSelect.vue';
import VendorSelect from '@/components/Shared/VendorSelect.vue';
import OrderSelect from '@/components/Shared/OrderSelect.vue';
import ItemTypeSelect from '@/components/Shared/ItemTypeSelect.vue';
import ProjectSelect from '@/components/Shared/ProjectSelect.vue';
import ParentCostCodeSelect from '@/components/Shared/ParentCostCodeSelect.vue';
import CorporationSelect from '@/components/Shared/CorporationSelect.vue';
import DivisionSelect from '@/components/Shared/DivisionSelect.vue';
import VendorForm from '@/components/PurchaseOrders/VendorForm.vue';

// Props
interface Props {
  form: any;
  editingConfiguration: boolean;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:form': [value: any];
  'validation-change': [isValid: boolean];
}>();

// Stores
const corpStore = useCorporationStore();
const divisionsStore = useCostCodeDivisionsStore();
const chartOfAccountsStore = useChartOfAccountsStore();
const vendorStore = useVendorStore();
const uomStore = useUOMStore();
const configurationsStore = useCostCodeConfigurationsStore();
const itemTypesStore = useItemTypesStore();
const projectsStore = useProjectsStore();

// Currency formatting
const { currencySymbol } = useCurrencyFormat();

// Local state for data (on-demand fetch for this page only)
const localDivisions = ref<any[]>([]);
const localConfigurations = ref<any[]>([]);
const localVendors = ref<any[]>([]);
const localChartOfAccounts = ref<any[]>([]);
const loadingDivisions = ref(false);
const loadingConfigurations = ref(false);
const loadingVendors = ref(false);
const loadingChartOfAccounts = ref(false);

// State
const showItemModal = ref(false);
const showVendorModal = ref(false);
const effectiveDatePopoverOpen = ref(false);
const itemAsOfDatePopoverOpen = ref(false);
const editingItemIndex = ref<number | null>(null);
const itemForm = ref({
  item_sequence: '',
  item_name: '',
  item_type_uuid: '',
  project_uuid: '',
  corporation_uuid: '',
  unit_price: '',
  unit: '',
  description: '',
  status: 'Active',
  initial_quantity: '',
  as_of_date: '',
  reorder_point: '',
  maximum_limit: ''
});

// Computed
const getCorporationName = computed(() => {
  if (props.form.corporation_uuid) {
    // Try to get corporation name from store
    const corporation = corpStore.corporations?.find((c: any) => c.uuid === props.form.corporation_uuid);
    return corporation?.corporation_name || 'Unnamed Corporation';
  }
  return corpStore.selectedCorporation?.corporation_name || 'Unnamed Corporation';
});

// Date formatter
const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
});

// Effective date computed property
const effectiveDateValue = computed({
  get: () => {
    if (!props.form.effective_from) return null;
    const date = new Date(props.form.effective_from);
    return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  },
  set: (value: CalendarDate | null) => {
    if (value) {
      const dateString = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
      handleFormUpdate('effective_from', dateString);
    } else {
      handleFormUpdate('effective_from', null);
    }
  }
});

const effectiveDateDisplayText = computed(() => {
  if (!effectiveDateValue.value) return 'Select Date';
  return df.format(effectiveDateValue.value.toDate(getLocalTimeZone()));
});

// Item As of Date computed property
const itemAsOfDateValue = computed({
  get: () => {
    if (!itemForm.value.as_of_date) return null;
    const src = String(itemForm.value.as_of_date);
    // Parse the date string directly
    const dateStr = src.includes('T') ? (src.split('T')[0] || src) : src;
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0]!, 10);
      const month = parseInt(parts[1]!, 10);
      const day = parseInt(parts[2]!, 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new CalendarDate(year, month, day);
      }
    }
    return null;
  },
  set: (value: CalendarDate | null) => {
    if (value) {
      const dateString = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
      itemForm.value.as_of_date = dateString;
    } else {
      itemForm.value.as_of_date = '';
    }
  }
});

const itemAsOfDateDisplayText = computed(() => {
  if (!itemAsOfDateValue.value) return 'Select date';
  return df.format(itemAsOfDateValue.value.toDate(getLocalTimeZone()));
});

// Division options - now handled by DivisionSelect component


// UOM options
const uomOptions = computed(() => {
  if (!corpStore.selectedCorporation) return [];
  const uoms = uomStore.getActiveUOM(corpStore.selectedCorporation.uuid);
  return uoms.map((uom: any) => ({
    label: `${uom.short_name} - ${uom.uom_name}`,
    value: uom.short_name,
    short_name: uom.short_name,
    full_name: uom.uom_name
  }));
});

// Last used order number
const lastUsedOrderNumber = computed(() => {
  const corporationUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corporationUuid) {
    return null;
  }

  // Get all existing configurations for this corporation
  const configurations = configurationsStore.configurations || [];
  
  let targetConfigs = [];

  if (props.form.division_uuid) {
    // If division is selected, filter by division
    const divisionConfigs = configurations.filter((config: any) => 
      config.division_uuid === props.form.division_uuid && 
      config.corporation_uuid === corporationUuid &&
      config.is_active
    );

    // If there's a parent cost code selected, filter by parent
    if (props.form.parent_cost_code_uuid) {
      targetConfigs = divisionConfigs.filter((config: any) => 
        config.parent_cost_code_uuid === props.form.parent_cost_code_uuid
      );
    } else {
      // If no parent selected, only include configurations with no parent (root level)
      targetConfigs = divisionConfigs.filter((config: any) => 
        !config.parent_cost_code_uuid
      );
    }
  } else {
    // If no division is selected, show configurations without division (division_uuid is null)
    targetConfigs = configurations.filter((config: any) => 
      !config.division_uuid && 
      config.corporation_uuid === corporationUuid &&
      config.is_active
    );
  }

  // Extract order numbers from existing configurations
  const orderNumbers = targetConfigs
    .map((config: any) => {
      const order = config.order;
      return order && !isNaN(parseInt(order, 10)) ? parseInt(order, 10) : 0;
    })
    .filter(num => num > 0);

  // Find the highest order number
  if (orderNumbers.length === 0) {
    return null;
  }

  const maxOrder = Math.max(...orderNumbers);
  return maxOrder;
});

// Methods
const handleFormUpdate = (field: string, value: any) => {
  emit('update:form', { ...props.form, [field]: value });
};

const handleGLAccountChange = (account: any) => {
  // Handle both string UUID and object with value property
  let accountUuid = null;
  if (typeof account === 'string') {
    accountUuid = account;
  } else if (account?.value) {
    accountUuid = account.value;
  }
  
  // Update the form with the selected account UUID
  if (accountUuid) {
    handleFormUpdate('gl_account_uuid', accountUuid);
  }
};

const handleVendorChange = (vendor: any) => {
  // Handle both string UUID and object with value property
  let vendorUuid = null;
  if (typeof vendor === 'string') {
    vendorUuid = vendor;
  } else if (vendor?.value) {
    vendorUuid = vendor.value;
  }
  
  // Update the form with the selected vendor UUID (can be null)
  handleFormUpdate('preferred_vendor_uuid', vendorUuid);
};

const handleItemTypeChange = (itemType: any) => {
  // Handle both string UUID and object with value property
  let itemTypeUuid = null;
  if (typeof itemType === 'string') {
    itemTypeUuid = itemType;
  } else if (itemType?.value) {
    itemTypeUuid = itemType.value;
  }
  
  // Update the item form with the selected item type UUID
  if (itemTypeUuid) {
    itemForm.value.item_type_uuid = itemTypeUuid;
  }
};

const handleProjectChange = (project: any) => {
  // Handle both string UUID and object with value property
  let projectUuid = null;
  if (typeof project === 'string') {
    projectUuid = project;
  } else if (project?.value) {
    projectUuid = project.value;
  }
  
  // Update the item form with the selected project UUID
  itemForm.value.project_uuid = projectUuid || '';
};

const handleParentCostCodeChange = (value: string | undefined | null) => {
  handleFormUpdate('parent_cost_code_uuid', value || null);
};

// Fetch divisions directly from API for the selected corporation (on-demand, page-specific)
const fetchDivisionsForCorporation = async (corporationUuid: string) => {
  if (!corporationUuid) {
    localDivisions.value = [];
    return;
  }

  loadingDivisions.value = true;
  try {
    const { data } = await $fetch<{ data: any[] }>(
      `/api/cost-code-divisions`,
      {
        query: { corporation_uuid: corporationUuid },
      }
    );
    localDivisions.value = data || [];
  } catch (err: any) {
    console.error('Error fetching divisions for corporation:', err);
    localDivisions.value = [];
  } finally {
    loadingDivisions.value = false;
  }
};

// Fetch cost code configurations directly from API for the selected corporation
const fetchConfigurationsForCorporation = async (corporationUuid: string) => {
  if (!corporationUuid) {
    localConfigurations.value = [];
    return;
  }

  loadingConfigurations.value = true;
  try {
    const response = await $fetch<{ success: boolean; data: any[] }>(
      `/api/cost-code-configurations`,
      {
        query: { corporation_uuid: corporationUuid },
      }
    );
    localConfigurations.value = response?.data || [];
  } catch (err: any) {
    console.error('Error fetching configurations for corporation:', err);
    localConfigurations.value = [];
  } finally {
    loadingConfigurations.value = false;
  }
};

// Fetch vendors directly from API for the selected corporation
const fetchVendorsForCorporation = async (corporationUuid: string) => {
  if (!corporationUuid) {
    localVendors.value = [];
    return;
  }

  loadingVendors.value = true;
  try {
    const response = await $fetch<{ data: any[] }>(
      `/api/purchase-orders/vendors`,
      {
        query: { corporation_uuid: corporationUuid },
      }
    );
    localVendors.value = response?.data || [];
  } catch (err: any) {
    console.error('Error fetching vendors for corporation:', err);
    localVendors.value = [];
  } finally {
    loadingVendors.value = false;
  }
};

// Fetch chart of accounts directly from API for the selected corporation
const fetchChartOfAccountsForCorporation = async (corporationUuid: string) => {
  if (!corporationUuid) {
    localChartOfAccounts.value = [];
    return;
  }

  loadingChartOfAccounts.value = true;
  try {
    const response = await $fetch<{ data: any[] }>(
      `/api/corporations/chart-of-accounts`,
      {
        query: { corporation_uuid: corporationUuid },
      }
    );
    localChartOfAccounts.value = response?.data || [];
  } catch (err: any) {
    console.error('Error fetching chart of accounts for corporation:', err);
    localChartOfAccounts.value = [];
  } finally {
    loadingChartOfAccounts.value = false;
  }
};

// Fetch all data for a corporation
const fetchAllDataForCorporation = async (corporationUuid: string) => {
  if (!corporationUuid) {
    localDivisions.value = [];
    localConfigurations.value = [];
    localVendors.value = [];
    localChartOfAccounts.value = [];
    return;
  }

  // Fetch all data in parallel
  await Promise.all([
    fetchDivisionsForCorporation(corporationUuid),
    fetchConfigurationsForCorporation(corporationUuid),
    fetchVendorsForCorporation(corporationUuid),
    fetchChartOfAccountsForCorporation(corporationUuid),
  ]);
};

const handleCorporationChange = async (corporation: any) => {
  if (corporation && corporation.value) {
    handleFormUpdate('corporation_uuid', corporation.value);
    // Clear division when corporation changes
    handleFormUpdate('division_uuid', null);
    // Fetch all data for the new corporation directly from API
    await fetchAllDataForCorporation(corporation.value);
  } else {
    localDivisions.value = [];
    localConfigurations.value = [];
    localVendors.value = [];
    localChartOfAccounts.value = [];
  }
};

const handleDivisionChange = (division: any) => {
  if (division && division.value) {
    handleFormUpdate('division_uuid', division.value);
  } else {
    handleFormUpdate('division_uuid', null);
  }
};

const getItemTypeName = (itemTypeUuid: string) => {
  if (!itemTypeUuid) return '-';
  const itemType = itemTypesStore.itemTypes.find((it: any) => it.uuid === itemTypeUuid);
  return itemType ? itemType.item_type : '-';
};

const getProjectName = (projectUuid: string) => {
  if (!projectUuid) return '-';
  const project = projectsStore.projects.find((p: any) => p.uuid === projectUuid);
  return project ? `${project.project_name} (${project.project_id})` : '-';
};

const getDivisionName = (divisionUuid: string) => {
  if (!divisionUuid) return '';
  const division = divisionsStore.divisions.find((d: any) => d.uuid === divisionUuid);
  return division ? division.division_name : '';
};

const getParentCostCodeName = (parentCostCodeUuid: string) => {
  if (!parentCostCodeUuid) return '';
  const configuration = configurationsStore.configurations.find((c: any) => c.uuid === parentCostCodeUuid);
  return configuration ? configuration.cost_code_name : '';
};

const openItemModal = () => {
  editingItemIndex.value = null;
  itemForm.value = {
    item_sequence: '',
    item_name: '',
    item_type_uuid: '',
    project_uuid: '',
    corporation_uuid: props.form.corporation_uuid || corpStore.selectedCorporation?.uuid || '',
    unit_price: '',
    unit: '',
    description: '',
    status: 'Active',
    initial_quantity: '',
    as_of_date: '',
    reorder_point: '',
    maximum_limit: ''
  };
  showItemModal.value = true;
};

const editItem = (index: number) => {
  editingItemIndex.value = index;
  const item = props.form.preferred_items[index];
    itemForm.value = { 
    item_sequence: item.item_sequence || '',
    item_name: item.item_name || '',
    item_type_uuid: item.item_type_uuid || '',
    project_uuid: item.project_uuid || '',
    corporation_uuid: props.form.corporation_uuid || item.corporation_uuid || corpStore.selectedCorporation?.uuid || '',
    unit_price: item.unit_price !== undefined && item.unit_price !== null ? String(item.unit_price) : '',
    unit: item.unit || '',
    description: item.description || '',
    status: item.status || 'Active',
    initial_quantity: item.initial_quantity !== undefined && item.initial_quantity !== null ? String(item.initial_quantity) : '',
    as_of_date: item.as_of_date || '',
    reorder_point: item.reorder_point !== undefined && item.reorder_point !== null ? String(item.reorder_point) : '',
    maximum_limit: item.maximum_limit !== undefined && item.maximum_limit !== null ? String(item.maximum_limit) : ''
  };
  showItemModal.value = true;
};

const closeItemModal = () => {
  showItemModal.value = false;
  editingItemIndex.value = null;
};

const saveItem = () => {
  // Validation
  if (!itemForm.value.item_sequence?.trim()) {
    const toast = useToast();
    toast.add({
      title: 'Validation Error',
      description: 'Item sequence is required',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (!itemForm.value.item_name?.trim()) {
    const toast = useToast();
    toast.add({
      title: 'Validation Error',
      description: 'Item name is required',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (!itemForm.value.item_type_uuid) {
    const toast = useToast();
    toast.add({
      title: 'Validation Error',
      description: 'Item type is required',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (!itemForm.value.unit_price || parseFloat(itemForm.value.unit_price as any) <= 0) {
    const toast = useToast();
    toast.add({
      title: 'Validation Error',
      description: 'Valid unit price is required',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (!itemForm.value.unit?.trim()) {
    const toast = useToast();
    toast.add({
      title: 'Validation Error',
      description: 'Unit (UOM) is required',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (!itemForm.value.project_uuid) {
    const toast = useToast();
    toast.add({
      title: 'Validation Error',
      description: 'Project is required',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  const items = [...(props.form.preferred_items || [])];
  
  // Prepare item data with proper parsing of numeric fields
  const itemData = {
    ...itemForm.value,
    unit_price: parseFloat(itemForm.value.unit_price as any),
    initial_quantity: itemForm.value.initial_quantity !== '' ? parseFloat(itemForm.value.initial_quantity as any) : undefined,
    reorder_point: itemForm.value.reorder_point !== '' ? parseFloat(itemForm.value.reorder_point as any) : undefined,
    maximum_limit: itemForm.value.maximum_limit !== '' ? parseFloat(itemForm.value.maximum_limit as any) : undefined,
    as_of_date: itemForm.value.as_of_date || undefined
  };
  
  if (editingItemIndex.value !== null) {
    items[editingItemIndex.value] = itemData;
  } else {
    items.push(itemData);
  }
  
  emit('update:form', { ...props.form, preferred_items: items });
  closeItemModal();
};

const deleteItem = (index: number) => {
  const items = [...(props.form.preferred_items || [])];
  items.splice(index, 1);
  emit('update:form', { ...props.form, preferred_items: items });
};

const openVendorModal = () => {
  const corporationUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corporationUuid) {
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: 'Please select a corporation first before adding vendors.',
      icon: 'i-heroicons-exclamation-triangle',
      color: 'error'
    });
    return;
  }
  
  // Ensure the selected corporation matches the form's corporation
  // VendorForm uses corpStore.selectedCorporation, so we need to ensure they match
  if (props.form.corporation_uuid && corpStore.selectedCorporation?.uuid !== props.form.corporation_uuid) {
    const toast = useToast();
    toast.add({
      title: 'Warning',
      description: 'Please ensure the corporation in the form matches the selected corporation.',
      icon: 'i-heroicons-exclamation-triangle',
      color: 'warning'
    });
    return;
  }
  
  showVendorModal.value = true;
};

const handleVendorSaved = async () => {
  const corporationUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (corporationUuid) {
    // Refresh vendors list to include the newly created vendor
    await fetchVendorsForCorporation(corporationUuid);
    
    // Also refresh the vendor store for consistency
    vendorStore.refreshVendorsFromAPI(corporationUuid);
    
    // Optionally, you could auto-select the newly created vendor here
    // by finding the most recently created vendor and setting it
    // For now, we'll just refresh the list and let the user select manually
  }
};

// Form validation
const isFormValid = computed(() => {
  return !!(
    props.form.corporation_uuid &&
    props.form.cost_code_number?.trim() &&
    props.form.cost_code_name?.trim() &&
    props.form.gl_account_uuid
  );
});

// Watch form changes and emit validation state
watch(
  () => props.form,
  () => {
    emit('validation-change', isFormValid.value);
  },
  { deep: true, immediate: true }
);

// Watch for corporation_uuid changes in form and fetch all data
watch(
  () => props.form.corporation_uuid,
  async (newCorporationUuid, oldCorporationUuid) => {
    // Only fetch if corporation actually changed and is not empty
    if (newCorporationUuid && newCorporationUuid !== oldCorporationUuid) {
      await fetchAllDataForCorporation(newCorporationUuid);
    } else if (!newCorporationUuid) {
      localDivisions.value = [];
      localConfigurations.value = [];
      localVendors.value = [];
      localChartOfAccounts.value = [];
    }
  },
  { immediate: false }
);

// Load data on mount
onMounted(async () => {
  const corporationUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (corporationUuid) {
    // Fetch all data directly from API for this page
    await fetchAllDataForCorporation(corporationUuid);
    // Still fetch UOM, item types, and projects from store (they're not used in the form selects)
    uomStore.fetchUOM(corporationUuid);
    itemTypesStore.fetchItemTypes(corporationUuid);
    projectsStore.fetchProjects(corporationUuid);
  }
});

// Refresh data when component becomes visible (e.g., after navigating back from division management)
onActivated(async () => {
  const corporationUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (corporationUuid) {
    // Fetch all data directly from API for this page
    await fetchAllDataForCorporation(corporationUuid);
    // Still fetch UOM, item types, and projects from store (they're not used in the form selects)
    uomStore.fetchUOM(corporationUuid);
    itemTypesStore.fetchItemTypes(corporationUuid);
    projectsStore.fetchProjects(corporationUuid);
  }
});

// Cleanup: Clear local data when component is unmounted to free up memory
onUnmounted(() => {
  // Clear all local data arrays to free up memory
  localDivisions.value = [];
  localConfigurations.value = [];
  localVendors.value = [];
  localChartOfAccounts.value = [];
  
  // Reset loading states
  loadingDivisions.value = false;
  loadingConfigurations.value = false;
  loadingVendors.value = false;
  loadingChartOfAccounts.value = false;
});
</script>

