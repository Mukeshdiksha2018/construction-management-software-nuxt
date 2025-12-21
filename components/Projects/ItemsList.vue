<template>
  <div>
    <!-- Items Table -->
    <div v-if="loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Loading skeleton -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-11 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-32" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center justify-end">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-11 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100">
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-32" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-12" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-5 w-16 rounded-full" />
              </div>
              <div class="flex items-center justify-end gap-1">
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="error">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="error"
        :description="'Please try refreshing the page or contact support if the issue persists.'"
      />
    </div>

    <div v-else-if="filteredItems.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredItems" 
        :columns="columns"
        v-model:global-filter="props.globalFilter"
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination -->
      <div v-if="shouldShowPagination(filteredItems.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Show:</span>
          <USelect
            v-model="pagination.pageSize"
            :items="pageSizeOptions"
            icon="i-heroicons-list-bullet"
            size="sm"
            variant="outline"
            class="w-32"
            @change="updatePageSize(table)"
          />
        </div>
        
        <UPagination v-bind="getPaginationProps(table)" />
        
        <div class="text-sm text-gray-600">
          {{ getPageInfo(table, 'items').value }}
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-cube" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      </div>
      <p class="text-gray-500 text-lg font-medium">No items found</p>
      <p class="text-gray-400 text-sm">Add items to cost code configurations to see them here</p>
    </div>

    <!-- View Item Modal -->
    <UModal v-model:open="showViewModal" :title="'Item Details'" :description="''">
      <template #body>
        <div class="p-6">
          <div v-if="itemToView" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Item Name</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">{{ itemToView.item_name || '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Item Sequence</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1 font-mono">{{ itemToView.item_sequence || '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Model Number</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">{{ itemToView.model_number || '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Cost Code</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">{{ itemToView.cost_code_number || '' }} - {{ itemToView.cost_code_name || '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Item Type</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {{ itemTypesStore.itemTypes.find((it: any) => it.uuid === itemToView.item_type_uuid)?.item_type || '-' }}
                </p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Project</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {{ projectsStore.projects.find((p: any) => p.uuid === itemToView.project_uuid) ? 
                      `${projectsStore.projects.find((p: any) => p.uuid === itemToView.project_uuid).project_name} (${projectsStore.projects.find((p: any) => p.uuid === itemToView.project_uuid).project_id})` 
                      : '-' }}
                </p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Unit Price</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">{{ formatCurrency(itemToView.unit_price) }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">UOM</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">{{ itemToView.unit || '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                <p class="text-sm mt-1">
                  <span :class="itemToView.status === 'Active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'" 
                        class="inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium">
                    {{ itemToView.status }}
                  </span>
                </p>
              </div>
              <div class="col-span-2">
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1 whitespace-pre-wrap">{{ itemToView.description || '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Initial Quantity</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">{{ itemToView.initial_quantity !== undefined && itemToView.initial_quantity !== null ? itemToView.initial_quantity : '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">As of Date</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">{{ itemToView.as_of_date || '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Reorder Point</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">{{ itemToView.reorder_point !== undefined && itemToView.reorder_point !== null ? itemToView.reorder_point : '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Maximum Limit</label>
                <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">{{ itemToView.maximum_limit !== undefined && itemToView.maximum_limit !== null ? itemToView.maximum_limit : '-' }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="closeViewModal">
            Close
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" :title="'Delete Item'" :description="''">
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mr-3" />
            <div>
              <h3 class="text-lg font-medium text-gray-900">Delete Item</h3>
              <p class="text-sm text-gray-500">This action cannot be undone.</p>
            </div>
          </div>
          
          <div v-if="itemToDelete" class="bg-gray-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-gray-700">
              <strong>Item Name:</strong> {{ itemToDelete.item_name }}<br>
              <strong>Cost Code:</strong> {{ itemToDelete.cost_code_number }} - {{ itemToDelete.cost_code_name }}<br>
              <strong>Unit Price:</strong> {{ formatCurrency(itemToDelete.unit_price) }}<br>
              <strong>Status:</strong> {{ itemToDelete.status }}
            </p>
          </div>
          
          <p class="text-gray-600">
            Are you sure you want to delete this item?
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Item
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Add/Edit Item Modal -->
    <UModal
      v-model:open="showItemModal"
      :fullscreen="!editingItem"
      :ui="editingItem
        ? { wrapper: 'max-w-2xl', body: 'sm:p-6 flex-1 overflow-y-auto p-4' }
        : { content: 'w-full', body: 'sm:p-6 flex-1 overflow-y-auto p-4' }"
    >
      <template #header>
        <h3 class="text-base font-semibold">{{ editingItem ? 'Edit Item' : 'Add Item' }}</h3>
      </template>
      <template #body>
        <div class="space-y-3">
          <!-- EDIT MODE: existing single-item form -->
          <template v-if="editingItem">
            <!-- Corporation Selection -->
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Corporation <span class="text-red-500">*</span>
              </label>
              <CorporationSelect
                :model-value="itemForm.corporation_uuid"
                placeholder="Select Corporation"
                size="sm"
                :disabled="!!editingItem"
                @change="(corporation) => handleCorporationChange(corporation)"
              />
              <p class="text-xs text-gray-500 mt-1">Corporation cannot be changed when editing</p>
            </div>

            <!-- Cost Code Selection -->
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Cost Code <span class="text-red-500">*</span>
              </label>
              <CostCodeSelect
                :model-value="itemForm.cost_code_configuration_uuid"
                placeholder="Select Cost Code"
                size="sm"
                :corporation-uuid="itemForm.corporation_uuid"
                :disabled="!!editingItem || !itemForm.corporation_uuid"
                @change="(costCode) => handleCostCodeChange(costCode)"
              />
              <p class="text-xs text-gray-500 mt-1">Cost code cannot be changed when editing</p>
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
              Item Sequence <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="itemForm.item_sequence"
                placeholder="Enter item sequence (e.g., A-123, SEQ-01)"
                size="sm"
                class="w-full"
              />
              <p class="text-xs text-gray-500 mt-1">Optional alphanumeric identifier (letters, numbers, and symbols like -)</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Model Number
              </label>
              <UInput
                v-model="itemForm.model_number"
                placeholder="Enter model number"
                size="sm"
                class="w-full"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-default mb-1 flex items-center gap-1">
                Project <span class="text-red-500">*</span>
              </label>
              <ProjectSelect
                :model-value="itemForm.project_uuid"
                placeholder="Select project"
                size="sm"
                :corporation-uuid="itemForm.corporation_uuid"
                :disabled="!itemForm.corporation_uuid"
                @change="(project) => handleProjectChange(project)"
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
                :corporation-uuid="itemForm.corporation_uuid"
                :project-uuid="itemForm.project_uuid"
                :disabled="!itemForm.project_uuid || !itemForm.corporation_uuid"
                @change="(itemType) => handleItemTypeChange(itemType)"
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
                    step="0.01"
                    placeholder="0.00"
                    size="sm"
                    class="w-full pl-6"
                    :disabled="!itemForm.project_uuid"
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
                  :disabled="!itemForm.project_uuid"
                  @update:model-value="(selected: any) => itemForm.unit = selected?.value || ''"
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
                :disabled="!itemForm.project_uuid"
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
                :disabled="!itemForm.project_uuid"
              />
            </div>

            <!-- Inventory Management Fields -->
            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 class="text-sm font-semibold text-default mb-3 flex items-center gap-2">
                <UIcon name="i-heroicons-cube-solid" class="w-4 h-4 text-brand-600" />
                Inventory Management
              </h4>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-default mb-1">
                  Initial Quantity
                </label>
                <UInput
                  v-model="itemForm.initial_quantity"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  size="sm"
                  class="w-full"
                  :disabled="!itemForm.project_uuid"
                  @keypress="(e: KeyboardEvent) => { if (e.key && !/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab' && e.key !== 'Enter') e.preventDefault(); }"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-default mb-1">
                  As of Date
                </label>
                <UPopover 
                  v-model:open="asOfDatePopoverOpen" 
                  :disabled="!itemForm.project_uuid"
                >
                  <UButton 
                    color="neutral" 
                    variant="outline" 
                    icon="i-heroicons-calendar-days"
                    class="w-full justify-start"
                    size="sm"
                    :disabled="!itemForm.project_uuid"
                  >
                    {{ asOfDateDisplayText }}
                  </UButton>
                  <template #content>
                    <UCalendar 
                      v-model="asOfDateValue" 
                      class="p-2" 
                      :disabled="!itemForm.project_uuid" 
                      @update:model-value="asOfDatePopoverOpen = false"
                    />
                  </template>
                </UPopover>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-default mb-1">
                  Reorder Point
                </label>
                <UInput
                  v-model="itemForm.reorder_point"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  size="sm"
                  class="w-full"
                  :disabled="!itemForm.project_uuid"
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
                  step="0.01"
                  placeholder="0.00"
                  size="sm"
                  class="w-full"
                  :disabled="!itemForm.project_uuid"
                  @keypress="(e: KeyboardEvent) => { if (e.key && !/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab' && e.key !== 'Enter') e.preventDefault(); }"
                />
              </div>
            </div>
          </template>

          <!-- ADD MODE: manage multiple items for selected item type -->
          <template v-else>
            <div class="flex items-start gap-2">
              <div class="w-64 flex-shrink-0">
                <label class="block text-sm font-medium text-default mb-1">
                  Corporation <span class="text-red-500">*</span>
                </label>
                <CorporationSelect
                  :model-value="itemForm.corporation_uuid"
                  placeholder="Select Corporation"
                  size="sm"
                  class="w-full"
                  @change="(corporation) => handleCorporationChange(corporation)"
                />
              </div>

              <div class="w-72 flex-shrink-0">
                <label class="block text-sm font-medium text-default mb-1 flex items-center gap-1">
                  Project <span class="text-red-500">*</span>
                </label>
                <ProjectSelect
                  :model-value="itemForm.project_uuid"
                  placeholder="Select project"
                  size="sm"
                  :corporation-uuid="itemForm.corporation_uuid"
                  :disabled="!itemForm.corporation_uuid"
                  class="w-full"
                  @change="(project) => handleProjectChange(project)"
                />
              </div>
              
              <div class="w-64 flex-shrink-0">
                <label class="block text-sm font-medium text-default mb-1">
                  Item Type <span class="text-red-500">*</span>
                </label>
                <ItemTypeSelect
                  :model-value="itemForm.item_type_uuid"
                  placeholder="Select item type"
                  size="sm"
                  :corporation-uuid="itemForm.corporation_uuid"
                  :project-uuid="itemForm.project_uuid"
                  :disabled="!itemForm.project_uuid || !itemForm.corporation_uuid"
                  class="w-full"
                  @change="(itemType) => handleItemTypeChange(itemType)"
                />
              </div>
            </div>

            <div v-if="canShowItemsTable" class="mt-6">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-default flex items-center gap-2">
                  <UIcon name="i-heroicons-cube" class="w-4 h-4" />
                  Items under this Item Type
                </h4>
                <div class="flex items-center gap-2">
                  <UButton
                    size="xs"
                    color="primary"
                    variant="solid"
                    icon="i-heroicons-plus-solid"
                    @click="addEmptyItemRow"
                  >
                    Add Row
                  </UButton>
                </div>
              </div>
              <UTable
                :data="addItemsRows"
                :columns="addItemsColumns"
                sticky
                :column-pinning="{ left: [], right: ['actions'] }"
                :ui="{ th: 'px-3 py-2 text-xs font-semibold', td: 'p-2 text-xs whitespace-nowrap' }"
                class="max-h-[50vh] overflow-auto"
              />
            </div>
            <div v-else class="mt-6">
              <div class="text-xs text-muted">
                Select a Corporation, Project and Item Type to view and add items.
              </div>
            </div>
          </template>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="soft" @click="closeItemModal">
            Cancel
          </UButton>
          <UButton color="primary" :loading="isSaving" :disabled="isSaving" @click="saveItem">
            {{ editingItem ? 'Update' : 'Add' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onMounted, useTemplateRef, resolveComponent, nextTick } from 'vue';
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date';
import { useCorporationStore } from '@/stores/corporations';
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations';
import { useItemTypesStore } from '@/stores/itemTypes';
import { useUOMStore } from '@/stores/uom';
import { useProjectsStore } from '@/stores/projects';
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';
import { useUTCDateFormat } from '@/composables/useUTCDateFormat';
import { useTableStandard } from '@/composables/useTableStandard';
import { usePermissions } from '@/composables/usePermissions';
import ItemTypeSelect from '@/components/Shared/ItemTypeSelect.vue';
import ProjectSelect from '@/components/Shared/ProjectSelect.vue';
import CostCodeSelect from '@/components/Shared/CostCodeSelect.vue';
import CorporationSelect from '@/components/Shared/CorporationSelect.vue';
import type { TableColumn } from '@nuxt/ui';

// Resolve components (only for use in h() function for table cells)
const UButton = resolveComponent('UButton');
const UTooltip = resolveComponent('UTooltip');
const USelectMenu = resolveComponent('USelectMenu');
const UInput = resolveComponent('UInput');
const USelect = resolveComponent('USelect');
// Note: UPopover and UCalendar are used directly in template (auto-imported by Nuxt UI)
// Do not resolve them here to avoid interfering with auto-import

interface Props {
  globalFilter?: string;
  projectFilter?: string;
}

const props = withDefaults(defineProps<Props>(), {
  globalFilter: '',
  projectFilter: undefined
});

// Stores
const corpStore = useCorporationStore();
const configurationsStore = useCostCodeConfigurationsStore();
const itemTypesStore = useItemTypesStore();
const uomStore = useUOMStore();
const projectsStore = useProjectsStore();

// Use permissions composable
const { hasPermission } = usePermissions();
const toast = useToast();

// Currency formatting
const { formatCurrency, currencySymbol } = useCurrencyFormat();
const { toUTCString, fromUTCString } = useUTCDateFormat();

const corporationNameByUuid = computed<Record<string, string>>(() => {
  const list = corpStore.corporations || []
  const map: Record<string, string> = {}
  list.forEach((corp: any) => { 
    if (corp?.uuid) {
      map[corp.uuid] = corp.corporation_name || corp.uuid
    }
  })
  return map
})

// Table functionality
const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  getPaginationProps,
  getPageInfo,
  shouldShowPagination
} = useTableStandard();

// State
const showDeleteModal = ref(false);
const showItemModal = ref(false);
const showViewModal = ref(false);
const itemToDelete = ref<any>(null);
const itemToView = ref<any>(null);
const editingItem = ref<any>(null);
const isSaving = ref(false);
const asOfDatePopoverOpen = ref(false);
const itemForm = ref({
  cost_code_configuration_uuid: '',
  item_name: '',
  item_sequence: '',
  model_number: '',
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

// Table ref
const table = useTemplateRef<any>('table');

// Date formatter for display
const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
});

// As of Date computed properties for UCalendar (matching PurchaseOrderForm.vue pattern exactly)
const asOfDateValue = computed({
  get: () => {
    if (!itemForm.value.as_of_date) return null;
    const src = String(itemForm.value.as_of_date);
    // Convert UTC string to local date string (YYYY-MM-DD)
    const localYmd = src.includes('T') ? fromUTCString(src) : src;
    // Parse the date string directly to avoid timezone issues
    // Split YYYY-MM-DD and create CalendarDate directly
    const parts = localYmd.split('-');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new CalendarDate(year, month, day);
      }
    }
    // Fallback: return null if parsing fails
    return null;
  },
  set: (value: CalendarDate | null) => {
    if (value) {
      // Create date string in YYYY-MM-DD format
      const dateString = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
      // Convert to UTC, treating the date as local midnight
      const utcString = toUTCString(dateString);
      itemForm.value.as_of_date = utcString || dateString;
    } else {
      itemForm.value.as_of_date = '';
    }
  }
});

// Display text for as of date input (matching EstimateForm.vue pattern)
const asOfDateDisplayText = computed(() => {
  if (!asOfDateValue.value) return 'Select date';
  return df.format(asOfDateValue.value.toDate(getLocalTimeZone()));
});

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// Computed
const loading = computed(() => configurationsStore.loading);
const error = computed(() => configurationsStore.error);

const allItems = computed(() => {
  if (!corpStore.selectedCorporation?.uuid) return [];
  return configurationsStore.getAllItems(corpStore.selectedCorporation.uuid);
});

const filteredItems = computed(() => {
  let filtered = allItems.value;
  
  // Apply project filter first
  if (props.projectFilter) {
    filtered = filtered.filter(item => item.project_uuid === props.projectFilter);
  }
  
  // Apply global search filter
  if (props.globalFilter?.trim()) {
    const searchTerm = props.globalFilter.toLowerCase().trim();
    
    filtered = filtered.filter(item => {
      const searchableFields = [
        item.item_name || '',
        item.item_sequence || '',
        item.model_number || '',
        item.cost_code_number || '',
        item.cost_code_name || '',
        item.unit || '',
        item.description || '',
        item.status || ''
      ];
      return searchableFields.some(field => 
        field.toLowerCase().includes(searchTerm)
      );
    });
  }
  
  return filtered;
});

// Cost code change handler
const handleCostCodeChange = (costCode: any) => {
  // Handle both string UUID and object with value property
  let costCodeUuid = null;
  if (typeof costCode === 'string') {
    costCodeUuid = costCode;
  } else if (costCode?.value) {
    costCodeUuid = costCode.value;
  }
  
  // Update the item form with the selected cost code UUID
  itemForm.value.cost_code_configuration_uuid = costCodeUuid || '';
};

// UOM options
const uomOptions = computed(() => {
  const corporationUuid = itemForm.value.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corporationUuid) return [];
  const uoms = uomStore.getActiveUOM(corporationUuid);
  return uoms.map((uom: any) => ({
    label: `${uom.short_name} - ${uom.uom_name}`,
    value: uom.short_name,
    short_name: uom.short_name,
    full_name: uom.uom_name
  }));
});

// Helpers for multi-item management (add mode)
const getItemsForItemType = (itemTypeUuid: string, projectUuid?: string) => {
  if (!corpStore.selectedCorporation?.uuid) return [];
  const all = configurationsStore.getAllItems(corpStore.selectedCorporation.uuid);
  return all.filter((item: any) => {
    if (item.item_type_uuid !== itemTypeUuid) return false;
    if (projectUuid && item.project_uuid !== projectUuid) return false;
    return true;
  });
};

const unitOptions = uomOptions;
const defaultUnit = computed(() => unitOptions.value?.[0]?.value || '');

const addItemsRows = ref<any[]>([]);

const makeItemsColumns = (rowsRef: any): TableColumn<any>[] => [
  {
    accessorKey: 'cost_code_configuration_uuid',
    header: () => h('span', { class: 'inline-flex items-center gap-1' }, [
      'Cost Code',
      h('span', { class: 'text-red-500' }, '*')
    ]),
    enableSorting: false,
    meta: { class: { th: 'w-64', td: 'w-64' } },
    cell: ({ row }: any) => h(CostCodeSelect as any, {
      modelValue: row.original.cost_code_configuration_uuid,
      placeholder: 'Select Cost Code',
      size: 'xs',
      corporationUuid: itemForm.value.corporation_uuid,
      disabled: !itemForm.value.corporation_uuid,
      onChange: (val: any) => {
        let uuid: string | null = null;
        if (typeof val === 'string') uuid = val; else if (val?.value) uuid = val.value;
        rowsRef.value[row.index].cost_code_configuration_uuid = uuid || '';
      }
    })
  },
  {
    accessorKey: 'item_sequence',
    header: () => h('span', { class: 'inline-flex items-center gap-1' }, [
      'Seq',
      h('span', { class: 'text-red-500' }, '*')
    ]),
    enableSorting: false,
    meta: { class: { th: 'w-36', td: 'w-36' } },
    cell: ({ row }: any) => h(UInput as any, {
      modelValue: row.original.item_sequence || '',
      size: 'xs',
      class: 'w-full',
      placeholder: 'Seq',
      'onUpdate:modelValue': (v: string) => rowsRef.value[row.index].item_sequence = v
    })
  },
  {
    accessorKey: 'model_number',
    header: 'Model Number',
    enableSorting: false,
    meta: { class: { th: 'w-40', td: 'w-40' } },
    cell: ({ row }: any) => h('div', { class: 'min-w-[8rem]' }, [
      h(UInput as any, {
        modelValue: row.original.model_number || '',
        size: 'xs',
        class: 'w-full',
        placeholder: 'Model #',
        'onUpdate:modelValue': (v: string) => rowsRef.value[row.index].model_number = v
      })
    ])
  },
  {
    accessorKey: 'item_name',
    header: () => h('span', { class: 'inline-flex items-center gap-1' }, [
      'Item Name',
      h('span', { class: 'text-red-500' }, '*')
    ]),
    enableSorting: false,
    meta: { class: { th: 'w-56', td: 'w-56' } },
    cell: ({ row }: any) => h('div', { class: 'min-w-[12rem]' }, [
      h(UInput as any, {
        modelValue: row.original.item_name || '',
        size: 'xs',
        class: 'w-full',
        placeholder: 'Enter item name',
        'onUpdate:modelValue': (v: string) => rowsRef.value[row.index].item_name = v
      })
    ])
  },
  {
    accessorKey: 'unit_price',
    header: () => h('span', { class: 'inline-flex items-center gap-1' }, [
      'Unit Price',
      h('span', { class: 'text-red-500' }, '*')
    ]),
    enableSorting: false,
    meta: { class: { th: 'w-40', td: 'w-40' } },
    cell: ({ row }: any) => h('div', { class: 'relative min-w-[8rem]' }, [
      h(UInput as any, {
        modelValue: row.original.unit_price ?? '',
        type: 'number',
        step: '0.01',
        placeholder: '0.00',
        size: 'xs',
        class: 'w-full pl-6',
        'onUpdate:modelValue': (v: string | number) => rowsRef.value[row.index].unit_price = v
      }),
      h('span', { class: 'absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted' }, (currencySymbol as any)?.value ?? currencySymbol as any)
    ])
  },
  {
    accessorKey: 'unit',
    header: () => h('span', { class: 'inline-flex items-center gap-1' }, [
      'UOM',
      h('span', { class: 'text-red-500' }, '*')
    ]),
    enableSorting: false,
    meta: { class: { th: 'w-14', td: 'w-14' } },
    cell: ({ row }: any) => h(USelectMenu as any, {
      modelValue: unitOptions.value.find((u: any) => u.value === row.original.unit),
      items: unitOptions.value,
      placeholder: 'UOM', size: 'xs', class: 'w-full',
      'onUpdate:modelValue': (selected: any) => rowsRef.value[row.index].unit = selected?.value || ''
    })
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    meta: { class: { th: 'w-64', td: 'w-64' } },
    cell: ({ row }: any) => h('div', { class: 'min-w-[12rem]' }, [
      h(UInput as any, {
        modelValue: row.original.description || '',
        size: 'xs',
        class: 'w-full',
        placeholder: 'Enter description',
        'onUpdate:modelValue': (v: string) => rowsRef.value[row.index].description = v
      })
    ])
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'w-20', td: 'w-20' } },
    cell: ({ row }: any) => h(USelect as any, {
      modelValue: row.original.status || 'Active',
      items: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' }
      ],
      size: 'xs',
      class: 'w-full',
      'value-attribute': 'value',
      'option-attribute': 'label',
      'onUpdate:modelValue': (val: string) => {
        rowsRef.value[row.index].status = val || 'Active';
      }
    })
  },
  {
    accessorKey: 'initial_quantity',
    header: 'Initial Quantity',
    enableSorting: false,
    meta: { class: { th: 'w-32', td: 'w-32' } },
    cell: ({ row }: any) => h('div', { class: 'min-w-[8rem]' }, [
      h(UInput as any, {
        modelValue: row.original.initial_quantity ?? '',
        type: 'number',
        step: '0.01',
        placeholder: '0.00',
        size: 'xs',
        class: 'w-full',
        'onUpdate:modelValue': (v: string | number) => rowsRef.value[row.index].initial_quantity = v
      })
    ])
  },
  {
    accessorKey: 'as_of_date',
    header: 'As of Date',
    enableSorting: false,
    meta: { class: { th: 'w-32', td: 'w-32' } },
    cell: ({ row }: any) => {
      // For table cells, use a simpler date input that works well in table context
      // The edit mode form uses UCalendar with UPopover
      const currentDate = row.original.as_of_date || '';
      let localDate = '';
      if (currentDate) {
        if (currentDate.includes('T')) {
          const utcDate = fromUTCString(currentDate);
          if (utcDate) {
            const parts = utcDate.split('T');
            localDate = parts[0] || '';
          }
        } else {
          localDate = currentDate;
        }
      }
      
      return h('div', { class: 'min-w-[8rem]' }, [
        h(UInput as any, {
          modelValue: localDate,
          type: 'date',
          size: 'xs',
          class: 'w-full',
          'onUpdate:modelValue': (v: string) => {
            if (v) {
              rowsRef.value[row.index].as_of_date = toUTCString(v);
            } else {
              rowsRef.value[row.index].as_of_date = '';
            }
          }
        })
      ]);
    }
  },
  {
    accessorKey: 'reorder_point',
    header: 'Reorder Point',
    enableSorting: false,
    meta: { class: { th: 'w-32', td: 'w-32' } },
    cell: ({ row }: any) => h('div', { class: 'min-w-[8rem]' }, [
      h(UInput as any, {
        modelValue: row.original.reorder_point ?? '',
        type: 'number',
        step: '0.01',
        placeholder: '0.00',
        size: 'xs',
        class: 'w-full',
        'onUpdate:modelValue': (v: string | number) => rowsRef.value[row.index].reorder_point = v
      })
    ])
  },
  {
    accessorKey: 'maximum_limit',
    header: 'Maximum Limit',
    enableSorting: false,
    meta: { class: { th: 'w-32', td: 'w-32' } },
    cell: ({ row }: any) => h('div', { class: 'min-w-[8rem]' }, [
      h(UInput as any, {
        modelValue: row.original.maximum_limit ?? '',
        type: 'number',
        step: '0.01',
        placeholder: '0.00',
        size: 'xs',
        class: 'w-full',
        'onUpdate:modelValue': (v: string | number) => rowsRef.value[row.index].maximum_limit = v
      })
    ])
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }: any) => h('div', { class: 'flex justify-end gap-1' }, [
      // Insert row after current
      h(UButton as any, {
        icon: 'i-heroicons-plus-solid', size: 'xs', color: 'secondary', variant: 'soft',
        onClick: () => {
          const base = {
            cost_code_configuration_uuid: '',
            item_name: '',
            item_sequence: '',
            model_number: '',
            unit_price: '',
            unit: defaultUnit.value,
            description: '',
            status: 'Active',
            initial_quantity: '',
            as_of_date: '',
            reorder_point: '',
            maximum_limit: ''
          };
          rowsRef.value.splice(row.index + 1, 0, base);
        }
      }),
      // Delete row
      h(UButton as any, {
        icon: 'mingcute:delete-fill', size: 'xs', color: 'error', variant: 'soft',
        onClick: () => rowsRef.value.splice(row.index, 1)
      })
    ])
  }
];

const addItemsColumns = computed(() => makeItemsColumns(addItemsRows));

const addEmptyItemRow = () => {
  const base = {
    cost_code_configuration_uuid: '',
    item_name: '',
    item_sequence: '',
    unit_price: '',
    unit: defaultUnit.value,
    description: '',
    status: 'Active',
    initial_quantity: '',
    as_of_date: '',
    reorder_point: '',
    maximum_limit: ''
  };
  addItemsRows.value.push({ ...base });
};

const validateRows = (rows: any[], projectUuid?: string, itemTypeUuid?: string) => {
  if (!projectUuid) return 'Please select a Project.';
  if (!itemTypeUuid) return 'Please select an Item Type.';
  if (!rows.length) return 'Please add at least one item row.';
  for (const r of rows) {
    if (!r.cost_code_configuration_uuid) return 'Each row requires a Cost Code.';
    if (!r.item_name?.trim()) return 'Each row requires an Item Name.';
    if (!r.item_sequence?.trim()) return 'Each row requires an Item Sequence.';
    const p = parseFloat(r.unit_price);
    if (!Number.isFinite(p) || p <= 0) return 'Each row requires a valid Unit Price.';
    if (!r.unit?.trim()) return 'Each row requires a UOM.';
  }
  return null;
};

const saveRowsForItemType = async (rows: any[], itemTypeUuid: string, projectUuid: string, corporationUuid: string) => {
  // Determine target config per row
  const targetByConfig = new Map<string, any[]>();
  const removeByConfig = new Map<string, Set<string>>();

  for (const r of rows) {
    const targetConfigUuid = r.cost_code_configuration_uuid;
    if (!targetByConfig.has(targetConfigUuid)) targetByConfig.set(targetConfigUuid, []);
    targetByConfig.get(targetConfigUuid)!.push(r);

    // If this row existed before and may be moving between configs, mark for removal from original
    if (r.uuid && r.original_cost_code_configuration_uuid && r.original_cost_code_configuration_uuid !== targetConfigUuid) {
      if (!removeByConfig.has(r.original_cost_code_configuration_uuid)) removeByConfig.set(r.original_cost_code_configuration_uuid, new Set());
      removeByConfig.get(r.original_cost_code_configuration_uuid)!.add(r.uuid);
    }
  }

  // Collect original configs that currently contain items for this item type
  const originalConfigsForItemType = new Set<string>();
  try {
    const allItems = configurationsStore.getAllItems(corporationUuid || '');
    for (const it of allItems) {
      if (it?.item_type_uuid === itemTypeUuid && it?.cost_code_configuration_uuid) {
        originalConfigsForItemType.add(it.cost_code_configuration_uuid);
      }
    }
  } catch (_) {
    // ignore lookup errors; proceed with known targets only
  }

  // Collect all configs we need to touch (originals + targets + moved-away)
  const touchedConfigUuids = new Set<string>([
    ...Array.from(targetByConfig.keys()),
    ...Array.from(removeByConfig.keys()),
    ...Array.from(originalConfigsForItemType.keys())
  ]);

  for (const configUuid of touchedConfigUuids) {
    const config = configurationsStore.getConfigurationById(configUuid);
    if (!config) throw new Error('Cost code configuration not found');

    let existing: any[] = Array.isArray(config.preferred_items) ? [...config.preferred_items] : [];

    // Hard delete: remove items for this item type that were deleted in the UI (not present in incoming rows)
    const incomingForThisConfig = (targetByConfig.get(configUuid) || []).filter((r) => !!r);
    const incomingIds = new Set((incomingForThisConfig
      .map((r: any) => r?.uuid)
      .filter((id: any) => !!id)) as string[]);
    existing = existing.filter((it: any) => {
      // Keep items that are not of this item type
      if (it?.item_type_uuid !== itemTypeUuid) return true;
      // If it belongs to this item type, keep only if it's still present in incoming rows for this config
      if (!it?.uuid) return false;
      return incomingIds.has(it.uuid);
    });

    // Remove rows that moved away from this config
    const toRemove = removeByConfig.get(configUuid);
    if (toRemove && toRemove.size > 0) {
      existing = existing.filter((it: any) => !(it?.uuid && toRemove.has(it.uuid)));
    }

    // Upsert rows targeting this config
    const incoming = targetByConfig.get(configUuid) || [];
    for (const r of incoming) {
      if (r.uuid) {
        // Update if exists, else append
        const idx = existing.findIndex((it: any) => it?.uuid === r.uuid);
        const updated = {
          ...(idx >= 0 ? existing[idx] : {}),
          uuid: r.uuid,
          item_name: r.item_name,
          item_sequence: r.item_sequence || undefined,
          model_number: r.model_number || undefined,
          item_type_uuid: itemTypeUuid,
          project_uuid: projectUuid,
          corporation_uuid: corporationUuid || '',
          unit_price: parseFloat(r.unit_price),
          unit: r.unit,
          description: r.description || '',
          status: r.status || 'Active',
          initial_quantity: r.initial_quantity !== undefined && r.initial_quantity !== null && r.initial_quantity !== '' ? parseFloat(r.initial_quantity) : undefined,
          as_of_date: r.as_of_date || undefined,
          reorder_point: r.reorder_point !== undefined && r.reorder_point !== null && r.reorder_point !== '' ? parseFloat(r.reorder_point) : undefined,
          maximum_limit: r.maximum_limit !== undefined && r.maximum_limit !== null && r.maximum_limit !== '' ? parseFloat(r.maximum_limit) : undefined
        };
        if (idx >= 0) existing[idx] = updated; else existing.push(updated);
      } else {
        // New row
        existing.push({
          item_name: r.item_name,
          item_sequence: r.item_sequence || undefined,
          model_number: r.model_number || undefined,
          item_type_uuid: itemTypeUuid,
          project_uuid: projectUuid,
          corporation_uuid: corporationUuid || '',
          unit_price: parseFloat(r.unit_price),
          unit: r.unit,
          description: r.description || '',
          status: r.status || 'Active',
          initial_quantity: r.initial_quantity !== undefined && r.initial_quantity !== null && r.initial_quantity !== '' ? parseFloat(r.initial_quantity) : undefined,
          as_of_date: r.as_of_date || undefined,
          reorder_point: r.reorder_point !== undefined && r.reorder_point !== null && r.reorder_point !== '' ? parseFloat(r.reorder_point) : undefined,
          maximum_limit: r.maximum_limit !== undefined && r.maximum_limit !== null && r.maximum_limit !== '' ? parseFloat(r.maximum_limit) : undefined
        });
      }
    }

    await configurationsStore.updateConfiguration(config.uuid!, { ...config, preferred_items: existing });
  }
};

const canShowItemsTable = computed(() => !!(itemForm.value.corporation_uuid && itemForm.value.project_uuid && itemForm.value.item_type_uuid));

// Table columns
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'item_name',
    header: 'Item Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs font-medium text-default' }, row.original.item_name || '-')
  },
  {
    accessorKey: 'item_sequence',
    header: 'Seq',
    enableSorting: false,
    meta: { class: { th: 'text-left w-32', td: 'text-left w-32' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-muted font-mono' }, row.original.item_sequence || '-')
  },
  {
    accessorKey: 'model_number',
    header: 'Model Number',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-muted' }, row.original.model_number || '-')
  },
  {
    accessorKey: 'cost_code',
    header: 'Cost Code',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-default' }, `${row.original.cost_code_number || ''} - ${row.original.cost_code_name || ''}`)
  },
  {
    accessorKey: 'project',
    header: 'Project',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const project = projectsStore.projects.find((p: any) => p.uuid === row.original.project_uuid);
      return h('div', { class: 'text-xs text-muted' }, project ? `${project.project_name} (${project.project_id})` : '-');
    }
  },
  {
    accessorKey: 'unit_price',
    header: 'Unit Price',
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-muted' }, formatCurrency(row.original.unit_price))
  },
  {
    accessorKey: 'unit',
    header: 'UOM',
    enableSorting: false,
    meta: { class: { th: 'text-left w-12', td: 'text-left w-12' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-center text-muted' }, row.original.unit || '-')
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-muted max-w-xs truncate' }, row.original.description || '-')
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'text-left w-20', td: 'text-left w-20' } },
    cell: ({ row }) => {
      const isActive = row.original.status === 'Active';
      const colorClass = isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error';
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${colorClass}` 
      }, row.original.status)
    }
  },
  {
    accessorKey: 'initial_quantity',
    header: 'Initial Qty',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-muted' }, row.original.initial_quantity !== undefined && row.original.initial_quantity !== null ? row.original.initial_quantity : '-')
  },
  {
    accessorKey: 'as_of_date',
    header: 'As of Date',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const dateValue = row.original.as_of_date;
      if (!dateValue) return h('div', { class: 'text-xs text-muted' }, '-');
      
      // Convert UTC to local date string if needed
      let localDate = '';
      if (dateValue.includes('T')) {
        const utcDate = fromUTCString(dateValue);
        if (utcDate) {
          const parts = utcDate.split('T');
          localDate = parts[0] || '';
        } else {
          localDate = dateValue;
        }
      } else {
        localDate = dateValue;
      }
      
      // Format the date using DateFormatter
      try {
        const parts = localDate.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            const date = new CalendarDate(year, month, day);
            const formattedDate = df.format(date.toDate(getLocalTimeZone()));
            return h('div', { class: 'text-xs text-muted' }, formattedDate);
          }
        }
      } catch (error) {
        console.error('Error formatting date:', error);
      }
      
      // Fallback to original value if formatting fails
      return h('div', { class: 'text-xs text-muted' }, localDate);
    }
  },
  {
    accessorKey: 'reorder_point',
    header: 'Reorder Point',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-muted' }, row.original.reorder_point !== undefined && row.original.reorder_point !== null ? row.original.reorder_point : '-')
  },
  {
    accessorKey: 'maximum_limit',
    header: 'Max Limit',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-muted' }, row.original.maximum_limit !== undefined && row.original.maximum_limit !== null ? row.original.maximum_limit : '-')
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }) => {
      const buttons = [];
      
      // View button - show if user has view permission
      if (hasPermission('project_items_view')) {
        buttons.push(
          h(UTooltip, { text: 'View Item Details' }, () => [
            h(UButton, {
              icon: 'i-heroicons-eye-solid',
              size: 'xs',
              variant: 'soft',
              color: 'neutral',
              class: 'hover:scale-105 transition-transform',
              onClick: () => viewItem(row.original)
            }, () => '')
          ])
        );
      }
      
      // Edit button - show if user has edit permission
      if (hasPermission('project_items_edit')) {
        buttons.push(
          h(UTooltip, { text: 'Edit Item' }, () => [
            h(UButton, {
              icon: 'tdesign:edit-filled',
              size: 'xs',
              variant: 'soft',
              color: 'secondary',
              class: 'hover:scale-105 transition-transform',
              onClick: () => editItemAction(row.original)
            }, () => '')
          ])
        );
      }
      
      // Delete button - show if user has delete permission
      if (hasPermission('project_items_delete')) {
        buttons.push(
          h(UTooltip, { text: 'Delete Item' }, () => [
            h(UButton, {
              icon: 'mingcute:delete-fill',
              size: 'xs',
              variant: 'soft',
              color: 'error',
              class: 'hover:scale-105 transition-transform',
              onClick: () => deleteItem(row.original)
            }, () => '')
          ])
        );
      }
      
      return h('div', { class: 'flex justify-end space-x-2' }, buttons);
    }
  }
];

// Methods
const openAddModal = () => {
  if (!hasPermission('project_items_create')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to create items.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  editingItem.value = null;
  itemForm.value = {
    cost_code_configuration_uuid: '',
    item_name: '',
    item_sequence: '',
    model_number: '',
    item_type_uuid: '',
    project_uuid: '',
    corporation_uuid: corpStore.selectedCorporation?.uuid || '',
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

const editItemAction = async (item: any) => {
  if (!hasPermission('project_items_edit')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to edit items.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  editingItem.value = item;
  itemForm.value = {
    cost_code_configuration_uuid: item.cost_code_configuration_uuid || '',
    item_name: item.item_name,
    item_sequence: item.item_sequence || '',
    model_number: item.model_number || '',
    item_type_uuid: item.item_type_uuid,
    project_uuid: item.project_uuid || '',
    corporation_uuid: corpStore.selectedCorporation?.uuid || item.corporation_uuid || '',
    unit_price: String(item.unit_price),
    unit: item.unit,
    description: item.description || '',
    status: item.status,
    initial_quantity: item.initial_quantity !== undefined && item.initial_quantity !== null ? String(item.initial_quantity) : '',
    as_of_date: item.as_of_date || '',
    reorder_point: item.reorder_point !== undefined && item.reorder_point !== null ? String(item.reorder_point) : '',
    maximum_limit: item.maximum_limit !== undefined && item.maximum_limit !== null ? String(item.maximum_limit) : ''
  };
  
  // Ensure item types are loaded for the project before opening modal
  // This ensures ItemTypeSelect can find and display the selected item type
  if (itemForm.value.project_uuid && itemForm.value.corporation_uuid) {
    try {
      await itemTypesStore.fetchItemTypes(
        itemForm.value.corporation_uuid,
        itemForm.value.project_uuid
      );
    } catch (error) {
      console.error('Error fetching item types for edit:', error);
    }
  }
  
  showItemModal.value = true;
  // Wait for next tick to ensure ItemTypeSelect component has updated with the new modelValue
  await nextTick();
};

const closeItemModal = () => {
  showItemModal.value = false;
  editingItem.value = null;
  isSaving.value = false;
  addItemsRows.value = [];
};

const handleItemTypeChange = (itemType: any) => {
  let itemTypeUuid = null;
  if (typeof itemType === 'string') {
    itemTypeUuid = itemType;
  } else if (itemType?.value) {
    itemTypeUuid = itemType.value;
  }
  
  if (itemTypeUuid) {
    itemForm.value.item_type_uuid = itemTypeUuid;
  }
};

const handleCorporationChange = (corporation: any) => {
  // Handle both string UUID and object with value property
  let corporationUuid = null;
  if (typeof corporation === 'string') {
    corporationUuid = corporation;
  } else if (corporation?.value) {
    corporationUuid = corporation.value;
  }
  
  const previousCorporationUuid = itemForm.value.corporation_uuid;
  const newCorporationUuid = corporationUuid || '';
  
  // Clear dependent fields when corporation changes
  // Only clear if the corporation actually changed
  if (previousCorporationUuid !== newCorporationUuid) {
    itemForm.value.project_uuid = '';
    itemForm.value.item_type_uuid = '';
    itemForm.value.cost_code_configuration_uuid = '';
    // Clear add mode rows when corporation changes
    if (!editingItem.value) {
      addItemsRows.value = [];
    }
  }
  
  // Update the item form with the selected corporation UUID
  itemForm.value.corporation_uuid = newCorporationUuid;
};

const handleProjectChange = async (project: any) => {
  // Handle both string UUID and object with value property
  let projectUuid = null;
  if (typeof project === 'string') {
    projectUuid = project;
  } else if (project?.value) {
    projectUuid = project.value;
  }
  
  const previousProjectUuid = itemForm.value.project_uuid;
  const newProjectUuid = projectUuid || '';
  
  // Clear item type selection when project changes
  // This ensures the item type dropdown shows only item types for the newly selected project
  // Only clear if the project actually changed
  if (previousProjectUuid !== newProjectUuid) {
    itemForm.value.item_type_uuid = '';
  }
  
  // Update the item form with the selected project UUID
  itemForm.value.project_uuid = newProjectUuid;
  
  // Explicitly fetch item types when a project is selected
  // This ensures item types are loaded even when the same corporation is reselected
  if (newProjectUuid && itemForm.value.corporation_uuid) {
    try {
      await itemTypesStore.fetchItemTypes(
        itemForm.value.corporation_uuid,
        newProjectUuid
      );
    } catch (error) {
      console.error('Error fetching item types for project:', error);
    }
  }
};

// Keep multi-item rows in sync when corporation, project or item type changes (add mode only)
watch(
  () => [itemForm.value.corporation_uuid, itemForm.value.project_uuid, itemForm.value.item_type_uuid],
  ([corporationUuid, projectUuid, itemTypeUuid]) => {
    if (editingItem.value || !corporationUuid || !projectUuid || !itemTypeUuid) {
      addItemsRows.value = [];
      return;
    }
    const existing = getItemsForItemType(itemTypeUuid, projectUuid) || [];
    addItemsRows.value = existing.map((it: any) => ({
      uuid: it.uuid,
      cost_code_configuration_uuid: it.cost_code_configuration_uuid || it.configuration_uuid || '',
      original_cost_code_configuration_uuid: it.cost_code_configuration_uuid || it.configuration_uuid || '',
      item_name: it.item_name || '',
      item_sequence: it.item_sequence || '',
      model_number: it.model_number || '',
      unit_price: it.unit_price ?? '',
      unit: it.unit || defaultUnit.value,
      description: it.description || '',
      status: it.status || 'Active',
      initial_quantity: it.initial_quantity ?? '',
      as_of_date: it.as_of_date || '',
      reorder_point: it.reorder_point ?? '',
      maximum_limit: it.maximum_limit ?? ''
    }));
  }
);

const saveItem = async () => {
  if (isSaving.value) return;
  // Validation
  if (editingItem.value) {
    // Single-item validation (edit mode)
    if (!itemForm.value.corporation_uuid) {
      toast.add({
        title: 'Validation Error',
        description: 'Please select a corporation',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      return;
    }

    if (!itemForm.value.cost_code_configuration_uuid) {
      toast.add({
        title: 'Validation Error',
        description: 'Please select a cost code',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      return;
    }

    if (!itemForm.value.item_name?.trim()) {
      toast.add({
        title: 'Validation Error',
        description: 'Item name is required',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      return;
    }

    if (!itemForm.value.item_sequence?.trim()) {
      toast.add({
        title: 'Validation Error',
        description: 'Item sequence is required',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      return;
    }

    // Validate project - required field
    if (!itemForm.value.project_uuid) {
      toast.add({
        title: 'Validation Error',
        description: 'Project is required. Please select a project.',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      return;
    }

    if (!itemForm.value.item_type_uuid) {
      toast.add({
        title: 'Validation Error',
        description: 'Item type is required',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      return;
    }

    if (!itemForm.value.unit_price || parseFloat(itemForm.value.unit_price) <= 0) {
      toast.add({
        title: 'Validation Error',
        description: 'Valid unit price is required',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      return;
    }

    if (!itemForm.value.unit?.trim()) {
      toast.add({
        title: 'Validation Error',
        description: 'Unit (UOM) is required',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      return;
    }
  } else {
    // Multi-item validation (add mode)
    if (!itemForm.value.corporation_uuid) {
      toast.add({
        title: 'Validation Error',
        description: 'Please select a corporation',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      return;
    }

    const err = validateRows(addItemsRows.value, itemForm.value.project_uuid, itemForm.value.item_type_uuid);
    if (err) {
      toast.add({
        title: 'Validation Error',
        description: err,
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      return;
    }
  }

  try {
    isSaving.value = true;
    if (editingItem.value) {
      // Existing single-item update logic
      const config = configurationsStore.getConfigurationById(itemForm.value.cost_code_configuration_uuid);
      if (!config) {
        throw new Error('Cost code configuration not found');
      }

      const updatedItems = [...(config.preferred_items || [])];
      
      const itemIndex = updatedItems.findIndex((item: any) => item.uuid === editingItem.value.uuid);
      if (itemIndex !== -1) {
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          item_name: itemForm.value.item_name,
          item_sequence: itemForm.value.item_sequence || undefined,
          model_number: itemForm.value.model_number || undefined,
          item_type_uuid: itemForm.value.item_type_uuid,
          project_uuid: itemForm.value.project_uuid,
          corporation_uuid: itemForm.value.corporation_uuid,
          unit_price: parseFloat(itemForm.value.unit_price),
          unit: itemForm.value.unit,
          description: itemForm.value.description,
          status: itemForm.value.status,
          initial_quantity: itemForm.value.initial_quantity ? parseFloat(itemForm.value.initial_quantity) : undefined,
          as_of_date: itemForm.value.as_of_date || undefined,
          reorder_point: itemForm.value.reorder_point ? parseFloat(itemForm.value.reorder_point) : undefined,
          maximum_limit: itemForm.value.maximum_limit ? parseFloat(itemForm.value.maximum_limit) : undefined
        };
      }

      await configurationsStore.updateConfiguration(config.uuid!, {
        ...config,
        preferred_items: updatedItems
      });

      toast.add({
        title: 'Success',
        description: 'Item updated successfully',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      });
    } else {
      // Multi-item save for selected item type
      await saveRowsForItemType(addItemsRows.value, itemForm.value.item_type_uuid, itemForm.value.project_uuid, itemForm.value.corporation_uuid);

      toast.add({
        title: 'Success',
        description: 'Items saved successfully',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      });
    }

    closeItemModal();
  } catch (error) {
    console.error('Error saving item:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to save item(s)',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  } finally {
    isSaving.value = false;
  }
};

const deleteItem = (item: any) => {
  if (!hasPermission('project_items_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete items.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  itemToDelete.value = item;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!hasPermission('project_items_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete items.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (!itemToDelete.value) return;

  try {
    // Get the configuration
    const config = configurationsStore.getConfigurationById(itemToDelete.value.cost_code_configuration_uuid);
    if (!config) {
      throw new Error('Cost code configuration not found');
    }

    // Remove the item from the items array
    const updatedItems = (config.preferred_items || []).filter((item: any) => item.uuid !== itemToDelete.value.uuid);

    // Update the configuration
    await configurationsStore.updateConfiguration(config.uuid!, {
      ...config,
      preferred_items: updatedItems
    });

    toast.add({
      title: 'Success',
      description: 'Item deleted successfully',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    });

    showDeleteModal.value = false;
    itemToDelete.value = null;
  } catch (error) {
    console.error('Error deleting item:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to delete item',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  }
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  itemToDelete.value = null;
};

const viewItem = (item: any) => {
  if (!hasPermission('project_items_view')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to view items.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  itemToView.value = item;
  showViewModal.value = true;
};

const closeViewModal = () => {
  showViewModal.value = false;
  itemToView.value = null;
};

// Watch for pagination changes
watch(() => pagination.value.pageSize, (newSize) => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(newSize);
  }
});

watch(() => props.globalFilter, () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0);
  }
});

// Watch for corporation changes
watch(
  () => corpStore.selectedCorporation?.uuid,
  async (uuid) => {
    if (uuid) {
      await configurationsStore.fetchConfigurations(uuid, false, true);
      await itemTypesStore.fetchItemTypes(uuid);
      await uomStore.fetchUOM(uuid);
      await projectsStore.fetchProjects(uuid);
    }
  },
  { immediate: true }
);

// Initialize
onMounted(async () => {
  if (corpStore.selectedCorporation?.uuid) {
    await configurationsStore.fetchConfigurations(corpStore.selectedCorporation.uuid, false, true);
    await itemTypesStore.fetchItemTypes(corpStore.selectedCorporation.uuid);
    await uomStore.fetchUOM(corpStore.selectedCorporation.uuid);
    await projectsStore.fetchProjects(corpStore.selectedCorporation.uuid);
  }
});

// Expose method for parent component to trigger add
defineExpose({
  openAddModal
});
</script>
