<template>
  <div>
    <div v-if="showHeader && corpStore.selectedCorporation" class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600">{{ titleLabel }}:</span>
          <div class="flex items-center space-x-1">
            <span class="text-lg font-bold text-gray-800">{{ getCorporationName }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
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
            v-model="importOption"
            :items="importOptions"
            size="xs"
            color="secondary"
            variant="soft"
            class="w-32"
            @change="handleImportOptionChange"
          />
          <UButton
            icon="material-symbols:delete-sweep"
            size="xs"
            color="error"
            variant="soft"
            @click="showDeleteAllModal = true"
            :disabled="!hasData"
          >
            {{ deleteAllLabel }}
          </UButton>

          <UButton
            icon="material-symbols:add-rounded"
            size="xs"
            color="primary"
            variant="solid"
            @click="openAddModal"
          >
            {{ addButtonLabel }}
          </UButton>
        </div>
      </div>
    </div>

    <div v-if="showHeader && !corpStore.selectedCorporation" class="text-gray-500">No corporation selected.</div>

    <!-- Content Slot for different implementations -->
    <slot 
      :loading="loading"
      :error="error"
      :data="filteredData"
      :columns="columns"
      :pagination="pagination"
      :paginationOptions="paginationOptions"
      :pageSizeOptions="pageSizeOptions"
      :shouldShowPagination="shouldShowPagination"
      :getPaginationProps="getPaginationProps"
      :getPageInfo="getPageInfo"
      :updatePageSize="updatePageSize"
      :table="table"
      :editItem="editItem"
      :deleteItem="deleteItem"
    />

    <!-- Add/Edit Modal Slot -->
    <slot 
      name="modal"
      :showModal="showModal"
      :editingItem="editingItem"
      :form="form"
      :getCorporationName="getCorporationName"
      :closeModal="closeModal"
      :submitItem="submitItem"
      :formFields="formFields"
    />

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
              <h4 class="font-medium text-gray-700">Preview ({{ csvData.length }} {{ dataTypeLabel }})</h4>
              
              <!-- Success Message (centered, small) -->
              <div v-if="!validationErrors.length" class="bg-green-50 border border-green-200 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                <svg class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm font-medium text-green-800">All {{ csvData.length }} {{ dataTypeLabel }} are valid and ready to import!</span>
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
            {{ importing ? 'Importing...' : `Import ${csvData.length} ${dataTypeLabel}` }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteModal" 
      :title="deleteModalTitle"
      :description="deleteModalDescription"
      @update:open="closeDeleteModal"
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
              <h3 class="text-lg font-medium text-red-800">{{ deleteModalTitle }}</h3>
              <p class="text-sm text-red-700">
                {{ deleteModalDescription }}
              </p>
            </div>
          </div>
          
          <div v-if="itemToDelete" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-700 mb-2">{{ itemTypeLabel }} Details:</h4>
            <slot 
              name="delete-details"
              :item="itemToDelete"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="secondary" variant="soft" @click="closeDeleteModal">
            Cancel
          </UButton>
          <UButton 
            color="error" 
            @click="confirmDelete"
            :loading="deleting"
          >
            {{ deleting ? 'Deleting...' : deleteButtonLabel }}
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
import { ref, watch, computed, onMounted } from "vue";
import { useCorporationStore } from "@/stores/corporations";
import { useTableStandard } from '@/composables/useTableStandard'
import Papa from 'papaparse';

interface Props {
  // Data management
  data: any[];
  loading: boolean;
  error: string | null;
  
  // Configuration
  type: 'divisions' | 'configuration';
  
  // Labels
  titleLabel: string;
  searchPlaceholder: string;
  addButtonLabel: string;
  deleteAllLabel: string;
  dataTypeLabel: string;
  itemTypeLabel: string;
  
  // UI Configuration
  showHeader?: boolean;
  
  // Modal titles and descriptions
  importModalTitle: string;
  importModalDescription: string;
  deleteModalTitle: string;
  deleteModalDescription: string;
  deleteButtonLabel: string;
  deleteAllModalTitle: string;
  deleteAllModalDescription: string;
  
  // CSV configuration
  csvInstructions: string;
  sampleCsvFormat: string;
  csvFormatDescription: string;
  
  // Table configuration
  columns: any[];
  previewColumns: any[];
  
  // Form configuration
  formFields: any[];
  
  // Store methods
  store: {
    fetchData: (uuid: string) => Promise<void>;
    createItem: (payload: any) => Promise<void>;
    updateItem: (id: string, payload: any) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    deleteAllItems: (uuid: string) => Promise<void>;
    bulkImportItems: (uuid: string, items: any[]) => Promise<any>;
  };
  
  // Validation and transformation
  validateAndTransformCSV: (data: any[]) => { data: any[], errors: string[] };
  getImportSuccessMessage: (result: any) => string;
  downloadSampleCSV: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true
});
const emit = defineEmits(['openAddModal', 'editItem', 'deleteItem']);

const corpStore = useCorporationStore();
const toast = useToast();

// Use table standard composable
const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  shouldShowPagination,
  getPaginationProps,
  getPageInfo
} = useTableStandard()

// State
const showModal = ref(false);
const editingItem = ref<null | string>(null);
const globalFilter = ref('');
const form = ref({});

// CSV Import related variables
const showImportModal = ref(false);
const csvData = ref<any[]>([]);
const validationErrors = ref<string[]>([]);
const importing = ref(false);
const fileInput = ref<HTMLInputElement>();

// Delete confirmation modal variables
const showDeleteModal = ref(false);
const itemToDelete = ref<any>(null);
const deleting = ref(false);

// Delete all modal variables
const showDeleteAllModal = ref(false);
const deletingAll = ref(false);

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

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

// Computed properties
const filteredData = computed(() => {
  if (!globalFilter.value.trim()) {
    return props.data;
  }

  const searchTerm = globalFilter.value.toLowerCase().trim();
  
  return props.data.filter(item => {
    // Search across all relevant fields - this will be customized per type
    const searchableFields = getSearchableFields(item);
    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

const hasData = computed(() => props.data.length > 0);
const dataCount = computed(() => props.data.length);

const getCorporationName = computed(() => {
  return corpStore.selectedCorporation?.corporation_name || "Unnamed Corporation";
});

// Methods
function getSearchableFields(item: any): string[] {
  if (props.type === 'divisions') {
    return [
      item.division_number || '',
      item.division_name || '',
      item.description || ''
    ];
  } else {
    // For configuration
    return [
      item.config_name || '',
      item.config_type || '',
      item.description || ''
    ];
  }
}

function openAddModal() {
  emit('openAddModal');
}

function editItem(item: any) {
  emit('editItem', item);
}

function deleteItem(id: string) {
  const item = props.data.find(item => item.uuid === id || item.id === id);
  if (item) {
    itemToDelete.value = item;
    showDeleteModal.value = true;
  }
}

function closeModal() {
  showModal.value = false;
  resetForm();
}

function resetForm() {
  form.value = {};
  editingItem.value = null;
}

function submitItem() {
  // This will be handled by the parent component
  emit('submitItem', form.value, editingItem.value);
}

function handleImportOptionChange() {
  if (importOption.value === 'import-csv') {
    showImportModal.value = true;
  }
  importOption.value = 'import-csv';
}

// CSV Import Functions
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

function closeImportModalAfterSuccess() {
  showImportModal.value = false;
  resetImport();
}

function resetImport() {
  csvData.value = [];
  validationErrors.value = [];
  if (fileInput.value) {
    fileInput.value.value = '';
  }
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
        const validatedData = props.validateAndTransformCSV(data);
        
        csvData.value = validatedData.data;
        validationErrors.value = validatedData.errors;
        
        if (validatedData.errors.length === 0) {
          toast.add({
            title: 'CSV Parsed Successfully',
            description: `${validatedData.data.length} ${props.dataTypeLabel} ready for import`,
            icon: 'i-heroicons-check-circle',
          });
        } else {
          toast.add({
            title: 'CSV Parsed with Warnings',
            description: `${validatedData.data.length} ${props.dataTypeLabel} ready, ${validatedData.errors.length} validation errors`,
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
  if (!corpStore.selectedCorporation || csvData.value.length === 0) return;
  
  importing.value = true;
  
  try {
    const result = await props.store.bulkImportItems(
      corpStore.selectedCorporation.uuid,
      csvData.value
    );
    
    if (result) {
      await props.store.fetchData(corpStore.selectedCorporation.uuid);
      
      toast.add({
        title: 'Import Successful',
        description: props.getImportSuccessMessage(result),
        icon: 'i-heroicons-check-circle'
      });
      
      closeImportModalAfterSuccess();
    } else {
      throw new Error('Bulk import failed - no result returned');
    }
    
  } catch (error) {
    console.error('Import error:', error);
    
    toast.add({
      title: 'Import Failed',
      description: error instanceof Error ? error.message : `Error importing ${props.dataTypeLabel}. Please try again.`,
      icon: 'i-heroicons-exclamation-triangle'
    });
  } finally {
    importing.value = false;
  }
}

// Delete functions
function closeDeleteModal() {
  showDeleteModal.value = false;
  itemToDelete.value = null;
  deleting.value = false;
}

async function confirmDelete() {
  if (!itemToDelete.value || !corpStore.selectedCorporation) {
    toast.add({
      title: 'Error',
      description: `No ${props.itemTypeLabel} selected for deletion`,
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  deleting.value = true;

  try {
    await props.store.deleteItem(itemToDelete.value.uuid || itemToDelete.value.id);
    
    toast.add({
      title: `${props.itemTypeLabel} deleted successfully!`,
      icon: 'i-heroicons-check-circle',
    });
    
    closeDeleteModal();
  } catch (error) {
    console.error('Delete error:', error);
    
    toast.add({
      title: `Failed to delete ${props.itemTypeLabel}`,
      description: error instanceof Error ? error.message : 'An error occurred while deleting',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    deleting.value = false;
  }
}

async function confirmDeleteAll() {
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
    await props.store.deleteAllItems(corpStore.selectedCorporation.uuid);
    
    toast.add({
      title: `All ${props.dataTypeLabel} deleted successfully!`,
      icon: 'i-heroicons-check-circle',
    });
    
    showDeleteAllModal.value = false;
  } catch (error) {
    toast.add({
      title: `Failed to delete all ${props.dataTypeLabel}`,
      description: error instanceof Error ? error.message : `An error occurred while deleting all ${props.dataTypeLabel}`,
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    deletingAll.value = false;
  }
}

// Watchers
watch(() => pagination.value.pageSize, (newSize) => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(newSize);
  }
});

watch(globalFilter, () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0);
  }
});

// Load data when corporation changes
watch(
  () => corpStore.selectedCorporation?.uuid,
  (uuid) => {
    if (uuid && process.client) {
      props.store.fetchData(uuid);
    }
  },
  { immediate: true }
);

// Initialize when component mounts
onMounted(async () => {
  if (process.client) {
    await corpStore.ensureReady();
    
    if (corpStore.selectedCorporation?.uuid) {
      props.store.fetchData(corpStore.selectedCorporation.uuid);
    }
  }
});

// Expose methods for parent component
defineExpose({
  openAddModal,
  editItem,
  deleteItem
});
</script>
