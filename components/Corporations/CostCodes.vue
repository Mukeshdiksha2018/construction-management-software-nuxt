<template>
  <div class="p-2">
    <!-- Tabs and Controls Row -->
    <div class="flex items-center justify-between mb-4">
      <!-- Tabs on the left -->
      <UTabs 
        :items="tabs" 
        :model-value="activeTab"
        @update:model-value="handleTabChange"
        size="sm" 
        color="neutral" 
        :content="false" 
      />

      <!-- Controls on the right -->
      <div v-if="corpStore.selectedCorporation" class="flex items-center space-x-2">
        <div class="max-w-sm">
          <UInput
            v-model="globalFilter"
            :placeholder="searchPlaceholder"
            icon="i-heroicons-magnifying-glass"
            variant="subtle"
            size="xs"
            class="w-full"
          />
        </div>
        <div class="flex gap-2">
          <USelect
            v-if="hasPermission('cost_codes_create')"
            v-model="importOption"
            :items="importOptions"
            size="xs"
            color="secondary"
            variant="soft"
            class="w-32"
            @change="handleImportOptionChange"
          />
          <UButton
            v-if="hasPermission('cost_codes_delete')"
            icon="material-symbols:delete-sweep"
            size="xs"
            color="error"
            variant="soft"
            @click="handleDeleteAll"
            :disabled="!hasData"
          >
            {{ deleteAllLabel }}
          </UButton>

          <UButton
            v-if="hasPermission('cost_codes_create')"
            icon="material-symbols:add-rounded"
            size="xs"
            color="primary"
            variant="solid"
            @click="handleAddNew"
          >
            {{ addButtonLabel }}
          </UButton>
        </div>
      </div>

      <div v-else class="text-gray-500 text-sm">No corporation selected.</div>
    </div>

    <!-- Tab Content (Full Width) -->
    <div class="w-full">
      <CostCodesDivision 
        v-if="activeTab === 'cost-codes-division'" 
        ref="costCodesDivisionTabRef"
        v-model:global-filter="globalFilter"
        :show-header="false"
      />
      <CostCodesConfiguration 
        v-if="activeTab === 'cost-codes-configuration'" 
        ref="costCodesConfigurationTabRef"
        v-model:global-filter="globalFilter"
        :show-header="false"
      />
    </div>

    <!-- Import CSV Modal -->
    <UModal 
      v-model:open="showImportModal" 
      :title="importModalTitle"
      :description="importModalDescription"
      fullscreen
      @update:open="closeImportModal"
    >
      <template #body>
        <div class="flex flex-col space-y-4">
          <!-- File Upload Section -->
          <div v-if="!csvData.length" class="space-y-4">
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div class="text-gray-400 mb-4">
                <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p class="text-gray-600 mb-2">Upload your CSV file</p>
              <p class="text-gray-400 text-sm mb-4" v-html="csvInstructions"></p>
              
              <input
                ref="fileInput"
                type="file"
                accept=".csv"
                class="hidden"
                @change="handleFileUpload"
              />
              
              <UButton
                icon="material-symbols:upload-file"
                color="primary"
                variant="soft"
                @click="triggerFileInput"
              >
                Choose CSV File
              </UButton>
            </div>
            
            <!-- Sample CSV Format -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-700">Expected CSV Format:</h4>
                <UButton
                  icon="material-symbols:download"
                  size="xs"
                  color="secondary"
                  variant="soft"
                  @click="downloadSampleCSV"
                >
                  Download Sample CSV
                </UButton>
              </div>
              <div class="text-sm text-gray-600 font-mono bg-white p-2 rounded border">
                <pre>{{ sampleCsvFormat }}</pre>
              </div>
              <p class="text-xs text-gray-500 mt-2" v-html="csvFormatDescription"></p>
            </div>
          </div>

          <!-- CSV Preview Section -->
          <div v-else class="space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-700">Preview ({{ csvData.length }} items)</h4>
              
              <!-- Success Message (centered, small) -->
              <div v-if="!validationErrors.length" class="bg-green-50 border border-green-200 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                <svg class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm font-medium text-green-800">All {{ csvData.length }} items are valid and ready to import!</span>
              </div>
              
              <UButton
                icon="material-symbols:refresh"
                size="xs"
                color="secondary"
                variant="soft"
                @click="resetImport"
              >
                Upload Different File
              </UButton>
            </div>
            
            <!-- Preview Table -->
            <UTable
              sticky 
              :data="csvData" 
              :columns="previewColumns"
              class="h-[calc(100vh-250px)]"
            />

            <!-- Validation Errors (if any) -->
            <div v-if="validationErrors.length" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <h5 class="font-medium text-red-800 mb-2">Validation Errors ({{ validationErrors.length }}):</h5>
              <ul class="text-sm text-red-700 space-y-1">
                <li v-for="error in validationErrors" :key="error" class="flex items-start gap-2">
                  <span class="text-red-500 mt-0.5">•</span>
                  <span>{{ error }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="error" variant="soft" @click="closeImportModal">
            Cancel
          </UButton>
          <UButton 
            v-if="csvData.length && !validationErrors.length"
            color="primary" 
            @click="confirmImport"
            :loading="importing"
          >
            {{ importing ? 'Importing...' : `Import ${csvData.length} items` }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete All Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteAllModal"
      :title="deleteAllModalTitle"
      :description="deleteAllModalDescription"
    >
      <template #body>
        <div class="flex flex-col space-y-4">
          <div class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-medium text-red-800">{{ deleteAllModalTitle }}</h3>
              <p class="text-sm text-red-700" v-html="deleteAllModalDescription"></p>
            </div>
          </div>
          
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-center gap-2">
              <svg class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span class="text-sm font-medium text-yellow-800">Warning</span>
            </div>
            <p class="text-sm text-yellow-700 mt-1">
              This is a destructive action that will remove all {{ dataTypeLabel }} data. Make sure you have a backup if needed.
            </p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="secondary" variant="soft" @click="showDeleteAllModal = false">
            Cancel
          </UButton>
          <UButton 
            color="error" 
            @click="confirmDeleteAll"
            :loading="deletingAll"
          >
            {{ deletingAll ? 'Deleting All...' : `Delete All ${dataCount} ${dataTypeLabel}` }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useCorporationStore } from "@/stores/corporations";
import { useCostCodeDivisionsStore } from "@/stores/costCodeDivisions";
import { useCostCodeConfigurationsStore } from "@/stores/costCodeConfigurations";
import { usePermissions } from '@/composables/usePermissions';
import CostCodesDivision from './CostCodesDivision.vue';
import CostCodesConfiguration from './CostCodesConfiguration.vue';
import Papa from 'papaparse';

const route = useRoute();
const router = useRouter();
const corpStore = useCorporationStore();
const divisionsStore = useCostCodeDivisionsStore();
const configurationsStore = useCostCodeConfigurationsStore();
const toast = useToast();
const { hasPermission } = usePermissions();

// Global filter for search
const globalFilter = ref('');

// Refs to child components
const costCodesDivisionTabRef = ref(null);
const costCodesConfigurationTabRef = ref(null);

// Tab configuration
const tabs = [
  {
    key: 'cost-codes-division',
    label: 'Cost Codes Division',
    icon: 'i-heroicons-building-office',
    value: 'cost-codes-division',
    slot: 'cost-codes-division'
  },
  {
    key: 'cost-codes-configuration',
    label: 'Cost Codes Configuration',
    icon: 'i-heroicons-cog-6-tooth',
    value: 'cost-codes-configuration',
    slot: 'cost-codes-configuration'
  }
];

// Active tab based on URL
const activeTab = computed(() => {
  const subTab = route.query.subTab;
  if (subTab && typeof subTab === 'string') {
    const validTab = tabs.find(t => t.value === subTab);
    return validTab ? subTab : 'cost-codes-division';
  }
  return 'cost-codes-division';
});

// Dynamic labels and configurations based on active tab
const searchPlaceholder = computed(() => {
  return activeTab.value === 'cost-codes-division' ? 'Search divisions...' : 'Search configurations...';
});

const addButtonLabel = computed(() => {
  return activeTab.value === 'cost-codes-division' ? 'Add Division' : 'Add Configuration';
});

const deleteAllLabel = computed(() => {
  return activeTab.value === 'cost-codes-division' ? 'Delete All Divisions' : 'Delete All Configurations';
});

const dataTypeLabel = computed(() => {
  return activeTab.value === 'cost-codes-division' ? 'divisions' : 'configurations';
});

const itemTypeLabel = computed(() => {
  return activeTab.value === 'cost-codes-division' ? 'Division' : 'Configuration';
});

const importModalTitle = computed(() => {
  return 'Import Cost Codes from CSV';
});

const importModalDescription = computed(() => {
  return 'Upload a single CSV file to bulk import divisions, cost codes, and sub-cost codes all at once.';
});

const deleteAllModalTitle = computed(() => {
  return activeTab.value === 'cost-codes-division' 
    ? 'Confirm Delete All Divisions' 
    : 'Confirm Delete All Configurations';
});

const deleteAllModalDescription = computed(() => {
  const count = activeTab.value === 'cost-codes-division' 
    ? divisionsStore.divisions.length 
    : configurationsStore.configurations.length;
  return `This will permanently delete <strong>ALL ${count} ${dataTypeLabel.value}</strong> for this corporation. This action cannot be undone.`;
});

// CSV configuration - unified format
const csvInstructions = computed(() => {
  return `
    <strong>For Divisions (rows with Division Number):</strong> Division Number, Division Name, Division Order (required), Description, Division Active<br>
    <strong>For Cost Codes (rows with Cost Code Number):</strong> Cost Code Number, Cost Code Name (required), Division Number, Parent Cost Code Number, Order, Description, Cost Code Active<br>
    <span class="text-xs">Note: Leave Division fields empty for cost code rows. Leave Parent Cost Code Number empty for top-level cost codes.</span><br>
    <span class="text-xs">Tip: Use "true" or "false" for Active Status fields. Division Order: 1-100, Cost Code Order: 1-200</span>
  `;
});

const sampleCsvFormat = computed(() => {
  return `Division Number,Division Name,Division Order,Division Description,Division Active,Cost Code Number,Cost Code Name,Parent Cost Code Number,Cost Code Order,Cost Code Description,Cost Code Active
01,General Requirements,1,General project requirements,true,,,,,,
01,,,,,01010,Mobilization,,1,Mobilization and site setup,true
01,,,,,01020,Project Management,,2,Project management and coordination,true
01,,,,,01030,Supervision,,3,Project supervision,true
01,,,,,01031,Project Manager,01030,1,Project manager supervision,true
01,,,,,01032,Superintendent,01030,2,Superintendent supervision,true
01,,,,,01033,Field Engineer,01030,3,Field engineering supervision,true
02,Existing Conditions,2,Existing site conditions,true,,,,,,
02,,,,,02010,Demolition,,1,Demolition work,true
02,,,,,02011,Interior Demolition,02010,1,Interior demolition,true
02,,,,,02012,Exterior Demolition,02010,2,Exterior demolition,true
02,,,,,02020,Site Survey,,2,Site surveying work,true
02,,,,,02030,Existing Conditions Documentation,,3,Document existing conditions,true
03,Concrete,3,Concrete work and materials,true,,,,,,
03,,,,,03010,Concrete Forming,,1,Concrete formwork,true
03,,,,,03011,Foundation Forms,03010,1,Foundation formwork,true
03,,,,,03012,Wall Forms,03010,2,Wall formwork,true
03,,,,,03013,Column Forms,03010,3,Column formwork,true
03,,,,,03020,Concrete Placement,,2,Concrete pouring and placement,true
03,,,,,03021,Foundation Concrete,03020,1,Foundation concrete placement,true
03,,,,,03022,Slab Concrete,03020,2,Slab concrete placement,true`;
});

const csvFormatDescription = computed(() => {
  return `
    <strong>Unified Format:</strong> One CSV can contain both divisions and cost codes<br>
    <strong>Divisions:</strong> Fill Division Number, Division Name, Division Order (required). Leave cost code fields empty.<br>
    <strong>Cost Codes:</strong> Fill Cost Code Number, Cost Code Name, and Division Number (to link to division). For top-level cost codes, leave Parent Cost Code Number empty. For sub-cost codes, provide Parent Cost Code Number.<br>
    <strong>Relationships:</strong> Cost codes reference divisions via Division Number column. Sub-cost codes reference parent via Parent Cost Code Number column.<br>
    <strong>Division Order:</strong> 1-100 | <strong>Cost Code Order:</strong> 1-200 | <strong>Active:</strong> "true" or "false" (defaults to true)
  `;
});

// Preview columns - unified format
const previewColumns = computed(() => {
  return [
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'division_number', header: 'Division Number' },
    { accessorKey: 'division_name', header: 'Division Name' },
    { accessorKey: 'cost_code_number', header: 'Cost Code Number' },
    { accessorKey: 'cost_code_name', header: 'Cost Code Name' },
    { accessorKey: 'parent_cost_code_number', header: 'Parent Code' },
    { accessorKey: 'order', header: 'Order' },
    { accessorKey: 'is_active', header: 'Active' }
  ];
});

// Computed properties

const hasData = computed(() => {
  if (activeTab.value === 'cost-codes-division') {
    return divisionsStore.divisions.length > 0;
  } else {
    return configurationsStore.configurations.length > 0;
  }
});

const dataCount = computed(() => {
  if (activeTab.value === 'cost-codes-division') {
    return divisionsStore.divisions.length;
  } else {
    return configurationsStore.configurations.length;
  }
});

// Import option related variables
const importOption = ref('import-csv');

// Import options for the select dropdown
const importOptions = [
  { 
    label: "Import CSV", 
    value: "import-csv",
    icon: "material-symbols:upload-file"
  }
];

// CSV Import related variables
const showImportModal = ref(false);
const csvData = ref<any[]>([]);
const validationErrors = ref<string[]>([]);
const importing = ref(false);
const fileInput = ref<HTMLInputElement>();

// Delete all modal variables
const showDeleteAllModal = ref(false);
const deletingAll = ref(false);

// Handle tab change
const handleTabChange = (tab: string | number) => {
  const tabValue = String(tab);
  const validTab = tabs.find(t => t.value === tabValue);
  
  if (validTab) {
    // Update URL with subTab parameter while preserving the main tab
    const currentQuery = { ...route.query };
    currentQuery.subTab = tabValue;
    router.push({ query: currentQuery });
  }
};

// Handle Add New button click - opens modal or navigates to form
const handleAddNew = () => {
  // Check for create permission
  if (!hasPermission('cost_codes_create')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to create cost codes. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  if (activeTab.value === 'cost-codes-division' && costCodesDivisionTabRef.value) {
    // Call the openAddModal method from CostCodesDivision
    (costCodesDivisionTabRef.value as any).openAddModal();
  } else if (activeTab.value === 'cost-codes-configuration') {
    // Navigate to cost code configuration form
    router.push('/cost-codes/form/new');
  }
};

// Handle Delete All button click with permission check
const handleDeleteAll = () => {
  // Check for delete permission
  if (!hasPermission('cost_codes_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete cost codes. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }
  
  showDeleteAllModal.value = true;
};

// Import functions
function handleImportOptionChange() {
  // Check for create permission
  if (!hasPermission('cost_codes_create')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to import cost codes. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  if (importOption.value === 'import-csv') {
    showImportModal.value = true;
  }
  importOption.value = 'import-csv';
}

function triggerFileInput() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

function closeImportModal() {
  showImportModal.value = false;
  resetImport();
  
  toast.add({
    title: 'Import Cancelled',
    description: 'CSV import has been cancelled',
    icon: 'i-heroicons-information-circle',
  });
}

function resetImport() {
  csvData.value = [];
  validationErrors.value = [];
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

// CSV validation and transformation - unified format
function validateAndTransformCSV(data: any[]) {
  const errors: string[] = [];
  const divisions: any[] = [];
  const configurations: any[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index starts at 0 and we have header
    
    // Extract all possible field names (case-insensitive)
    const divisionNumber = row['Division Number'] || row['division_number'] || '';
    const costCodeNumber = row['Cost Code Number'] || row['cost_code_number'] || '';
    const divisionName = row['Division Name'] || row['division_name'] || '';
    const divisionOrder = row['Division Order'] || row['division_order'] || '';
    
    // Determine if this is a division row or cost code row
    // A division row must have Division Number, Division Name, AND Division Order
    // A cost code row has Cost Code Number and may have Division Number (to reference division)
    const hasDivisionNumber = divisionNumber && divisionNumber.trim() !== '';
    const hasDivisionName = divisionName && divisionName.trim() !== '';
    const hasDivisionOrder = divisionOrder && divisionOrder.toString().trim() !== '';
    const isDivisionRow = hasDivisionNumber && hasDivisionName && hasDivisionOrder;
    
    // If division number exists but name/order are missing, and no cost code number, it's an incomplete division
    if (hasDivisionNumber && !isDivisionRow && !costCodeNumber) {
      const errorMsg = `Row ${rowNumber}: Missing required fields (Division Number, Division Name, Division Order). Found: Number=${divisionNumber}, Name=${divisionName || ''}, Order=${divisionOrder || ''}`;
      errors.push(errorMsg);
      return;
    }
    
    if (isDivisionRow) {
      // This is a complete division row - validate all fields
      
      // Validate division order range
      const orderNum = parseInt(divisionOrder.toString());
      if (isNaN(orderNum) || orderNum < 1 || orderNum > 100) {
        const errorMsg = `Row ${rowNumber}: Division Order "${divisionOrder}" must be a number between 1 and 100`;
        errors.push(errorMsg);
        return;
      }
      
      // Check for duplicate division numbers
      const existingNumber = divisions.find(item => item.division_number === divisionNumber.toString().trim());
      if (existingNumber) {
        const errorMsg = `Row ${rowNumber}: Duplicate division number "${divisionNumber}" found`;
        errors.push(errorMsg);
        return;
      }
      
      // Check for duplicate division orders
      const existingOrder = divisions.find(item => item.division_order === orderNum);
      if (existingOrder) {
        const errorMsg = `Row ${rowNumber}: Duplicate division order "${orderNum}" found`;
        errors.push(errorMsg);
        return;
      }
      
      // Parse active status
      const activeStatus = row['Division Active'] || row['division_active'] || row['Active Status'] || row['active_status'] || 'true';
      const isActive = activeStatus.toString().toLowerCase() === 'true';
      
      // Transform to our data structure
      const description = row['Division Description'] || row['division_description'] || row['Description'] || row['description'] || '';
      
      const transformedDivision = {
        division_number: divisionNumber.toString().trim(),
        division_name: divisionName.toString().trim(),
        division_order: orderNum,
        description: description ? description.toString().trim() : '',
        is_active: isActive
      };
      
      divisions.push(transformedDivision);
    } else if (costCodeNumber && costCodeNumber.trim() !== '') {
      // This is a cost code row
      const costCodeName = row['Cost Code Name'] || row['cost_code_name'] || '';
      
      if (!costCodeNumber || !costCodeName) {
        const errorMsg = `Row ${rowNumber}: Missing required fields (Cost Code Number, Cost Code Name). Found: Number=${costCodeNumber}, Name=${costCodeName}`;
        errors.push(errorMsg);
        return;
      }
      
      // Check for duplicate cost code numbers
      const existingNumber = configurations.find(item => item.cost_code_number === costCodeNumber.toString().trim());
      if (existingNumber) {
        const errorMsg = `Row ${rowNumber}: Duplicate cost code number "${costCodeNumber}" found`;
        errors.push(errorMsg);
        return;
      }
      
      // Validate order range if provided
      const order = row['Cost Code Order'] || row['cost_code_order'] || row['Order'] || row['order'] || '';
      if (order && order.toString().trim() !== '') {
        const orderNum = parseInt(order.toString());
        if (isNaN(orderNum) || orderNum < 1 || orderNum > 200) {
          const errorMsg = `Row ${rowNumber}: Cost Code Order "${order}" must be a number between 1 and 200`;
          errors.push(errorMsg);
          return;
        }
      }
      
      // Parse active status
      const activeStatus = row['Cost Code Active'] || row['cost_code_active'] || row['Active Status'] || row['active_status'] || 'true';
      const isActive = activeStatus.toString().toLowerCase() === 'true';
      
      // Get optional fields
      const divisionNumberRef = row['Division Number'] || row['division_number'] || '';
      const parentCostCodeNumber = row['Parent Cost Code Number'] || row['parent_cost_code_number'] || '';
      const description = row['Cost Code Description'] || row['cost_code_description'] || row['Description'] || row['description'] || '';
      
      const transformedConfig = {
        cost_code_number: costCodeNumber.toString().trim(),
        cost_code_name: costCodeName.toString().trim(),
        division_number: divisionNumberRef ? divisionNumberRef.toString().trim() : '',
        parent_cost_code_number: parentCostCodeNumber ? parentCostCodeNumber.toString().trim() : '',
        order: order && order.toString().trim() !== '' ? parseInt(order.toString()) : null,
        description: description ? description.toString().trim() : '',
        is_active: isActive,
        _rowNumber: rowNumber // Keep track of row number for error reporting
      };
      
      configurations.push(transformedConfig);
    } else {
      // Row has neither division number nor cost code number
      const errorMsg = `Row ${rowNumber}: Must have either Division Number or Cost Code Number`;
      errors.push(errorMsg);
      return;
    }
  });
  
  // Combine divisions and configurations for display
  const displayData = [
    ...divisions.map(d => ({ ...d, type: 'Division' })),
    ...configurations.map(c => ({ 
      ...c, 
      type: 'Cost Code',
      division_number: c.division_number,
      division_name: '',
      order: c.order || ''
    }))
  ];
  
  return { 
    data: displayData, 
    divisions,
    configurations,
    errors 
  };
}

function getImportSuccessMessage(result: any) {
  if (!result) return '';
  
  // Use the message from the API if available
  if (result.message) {
    return result.message;
  }
  
  // Otherwise construct a detailed message
  const divData = result.data?.divisions || {};
  const configData = result.data?.configurations || {};
  
  let message = `Import completed!\n\n`;
  message += `Divisions:\n`;
  message += `  • New: ${divData.new || 0}\n`;
  message += `  • Duplicates: ${divData.duplicates || 0}\n\n`;
  message += `Cost Codes:\n`;
  message += `  • New: ${configData.new || 0}\n`;
  message += `  • Duplicates: ${configData.duplicates || 0}`;
  
  if ((divData.errors || 0) > 0 || (configData.errors || 0) > 0) {
    message += `\n\nNote: ${(divData.errors || 0) + (configData.errors || 0)} errors occurred during import.`;
  }
  
  return message;
}

function downloadSampleCSV() {
  const sampleData = [
    ['Division Number', 'Division Name', 'Division Order', 'Division Description', 'Division Active', 'Cost Code Number', 'Cost Code Name', 'Parent Cost Code Number', 'Cost Code Order', 'Cost Code Description', 'Cost Code Active'],
    ['01', 'General Requirements', '1', 'General project requirements', 'true', '', '', '', '', '', ''],
    ['01', '', '', '', '', '01010', 'Mobilization', '', '1', 'Mobilization and site setup', 'true'],
    ['01', '', '', '', '', '01020', 'Project Management', '', '2', 'Project management and coordination', 'true'],
    ['01', '', '', '', '', '01030', 'Supervision', '', '3', 'Project supervision', 'true'],
    ['01', '', '', '', '', '01031', 'Project Manager', '01030', '1', 'Project manager supervision', 'true'],
    ['01', '', '', '', '', '01032', 'Superintendent', '01030', '2', 'Superintendent supervision', 'true'],
    ['01', '', '', '', '', '01033', 'Field Engineer', '01030', '3', 'Field engineering supervision', 'true'],
    ['02', 'Existing Conditions', '2', 'Existing site conditions', 'true', '', '', '', '', '', ''],
    ['02', '', '', '', '', '02010', 'Demolition', '', '1', 'Demolition work', 'true'],
    ['02', '', '', '', '', '02011', 'Interior Demolition', '02010', '1', 'Interior demolition', 'true'],
    ['02', '', '', '', '', '02012', 'Exterior Demolition', '02010', '2', 'Exterior demolition', 'true'],
    ['02', '', '', '', '', '02020', 'Site Survey', '', '2', 'Site surveying work', 'true'],
    ['02', '', '', '', '', '02030', 'Existing Conditions Documentation', '', '3', 'Document existing conditions', 'true'],
    ['03', 'Concrete', '3', 'Concrete work and materials', 'true', '', '', '', '', '', ''],
    ['03', '', '', '', '', '03010', 'Concrete Forming', '', '1', 'Concrete formwork', 'true'],
    ['03', '', '', '', '', '03011', 'Foundation Forms', '03010', '1', 'Foundation formwork', 'true'],
    ['03', '', '', '', '', '03012', 'Wall Forms', '03010', '2', 'Wall formwork', 'true'],
    ['03', '', '', '', '', '03013', 'Column Forms', '03010', '3', 'Column formwork', 'true'],
    ['03', '', '', '', '', '03020', 'Concrete Placement', '', '2', 'Concrete pouring and placement', 'true'],
    ['03', '', '', '', '', '03021', 'Foundation Concrete', '03020', '1', 'Foundation concrete placement', 'true'],
    ['03', '', '', '', '', '03022', 'Slab Concrete', '03020', '2', 'Slab concrete placement', 'true']
  ];

  // Convert to CSV string
  const csvContent = sampleData.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'sample_cost_codes_unified.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) {
    toast.add({
      title: 'No File Selected',
      description: 'Please select a CSV file to upload',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }
  
  if (!file.name.toLowerCase().endsWith('.csv')) {
    toast.add({
      title: 'Invalid File Type',
      description: 'Please select a valid CSV file (.csv extension)',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const csvText = e.target?.result as string;
    
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        if (results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          toast.add({
            title: 'CSV Parsing Error',
            description: 'Error parsing CSV file. Please check the format.',
            icon: 'i-heroicons-exclamation-triangle',
          });
          return;
        }
        
        const data = results.data as any[];
        
        if (data.length === 0) {
          toast.add({
            title: 'Empty File',
            description: 'CSV file is empty or has no valid data.',
            icon: 'i-heroicons-exclamation-triangle',
          });
          return;
        }
        
        // Validate and transform the data
        const validatedData = validateAndTransformCSV(data);
        
        csvData.value = validatedData.data;
        validationErrors.value = validatedData.errors;
        
        const totalItems = validatedData.divisions.length + validatedData.configurations.length;
        
        if (validatedData.errors.length === 0) {
          toast.add({
            title: 'CSV Parsed Successfully',
            description: `${validatedData.divisions.length} divisions and ${validatedData.configurations.length} cost codes ready for import`,
            icon: 'i-heroicons-check-circle',
          });
        } else {
          toast.add({
            title: 'CSV Parsed with Warnings',
            description: `${totalItems} items ready (${validatedData.divisions.length} divisions, ${validatedData.configurations.length} cost codes), ${validatedData.errors.length} validation errors`,
            icon: 'i-heroicons-exclamation-triangle',
            color: 'warning',
          });
        }
      }
    });
  };
  
  reader.onerror = (error: ProgressEvent<FileReader>) => {
    console.error('FileReader error:', error);
    toast.add({
      title: 'File Read Error',
      description: 'Error reading the file. Please try again.',
      icon: 'i-heroicons-exclamation-triangle',
    });
  };
  
  reader.readAsText(file);
}

async function confirmImport() {
  // Check for create permission
  if (!hasPermission('cost_codes_create')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to import cost codes. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  if (!corpStore.selectedCorporation || csvData.value.length === 0) return;
  
  importing.value = true;
  
  try {
    // Re-validate to get separated divisions and configurations
    const rawData = csvData.value.map((item: any) => {
      // Reconstruct original row format for validation
      if (item.type === 'Division') {
        return {
          'Division Number': item.division_number,
          'Division Name': item.division_name,
          'Division Order': item.division_order,
          'Division Description': item.description,
          'Division Active': item.is_active
        };
      } else {
        return {
          'Cost Code Number': item.cost_code_number,
          'Cost Code Name': item.cost_code_name,
          'Division Number': item.division_number,
          'Parent Cost Code Number': item.parent_cost_code_number,
          'Cost Code Order': item.order,
          'Cost Code Description': item.description,
          'Cost Code Active': item.is_active
        };
      }
    });
    
    const validatedData = validateAndTransformCSV(rawData);
    
    if (validatedData.errors.length > 0) {
      validationErrors.value = validatedData.errors;
      toast.add({
        title: 'Validation Errors',
        description: 'Please fix validation errors before importing.',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      });
      importing.value = false;
      return;
    }
    
    // Call unified bulk import endpoint
    const result = await $fetch('/api/cost-codes/bulk', {
      method: 'POST',
      body: {
        corporation_uuid: corpStore.selectedCorporation.uuid,
        divisions: validatedData.divisions,
        configurations: validatedData.configurations
      }
    });
    
    if (result) {
      // Refresh both stores - force API fetch (useIndexedDB=false) to get fresh data from server
      // This will also sync to IndexedDB automatically after fetching
      await Promise.all([
        divisionsStore.fetchDivisions(corpStore.selectedCorporation.uuid, true, false),
        configurationsStore.fetchConfigurations(corpStore.selectedCorporation.uuid, true, false)
      ]);
      
      toast.add({
        title: 'Import Successful',
        description: getImportSuccessMessage(result),
        icon: 'i-heroicons-check-circle'
      });
      
      showImportModal.value = false;
      resetImport();
    } else {
      throw new Error('Bulk import failed - no result returned');
    }
    
  } catch (error) {
    console.error('Import error:', error);
    
    toast.add({
      title: 'Import Failed',
      description: error instanceof Error ? error.message : 'Error importing cost codes. Please try again.',
      icon: 'i-heroicons-exclamation-triangle'
    });
  } finally {
    importing.value = false;
  }
}

// Delete all functions
async function confirmDeleteAll() {
  // Check for delete permission
  if (!hasPermission('cost_codes_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete cost codes. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  if (!corpStore.selectedCorporation) {
    toast.add({
      title: 'Error',
      description: 'No corporation selected',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  deletingAll.value = true;

  try {
    if (activeTab.value === 'cost-codes-division') {
      await divisionsStore.deleteAllDivisions(corpStore.selectedCorporation.uuid);
    } else {
      await configurationsStore.deleteAllConfigurations(corpStore.selectedCorporation.uuid);
    }
    
    toast.add({
      title: `All ${dataTypeLabel.value} deleted successfully!`,
      icon: 'i-heroicons-check-circle',
    });
    
    showDeleteAllModal.value = false;
  } catch (error) {
    toast.add({
      title: `Failed to delete all ${dataTypeLabel.value}`,
      description: error instanceof Error ? error.message : `An error occurred while deleting all ${dataTypeLabel.value}`,
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    deletingAll.value = false;
  }
}

// Initialize URL on mount
onMounted(() => {
  if (!route.query.subTab) {
    const currentQuery = { ...route.query };
    currentQuery.subTab = 'cost-codes-division';
    router.push({ query: currentQuery });
  }
});
</script>
