<template>
  <div class="h-[80vh] flex flex-col">
    <!-- Main Content Area -->
    <div class="flex-1 flex min-h-0">
      <!-- Left Panel: Three Rows in Column Layout -->
      <div ref="leftPanel" class="flex-1 flex flex-col min-h-0 overflow-y-auto pr-3" style="min-width: 800px;">
        <div class="mb-3 flex flex-col gap-4 flex-1 min-h-0">
          <!-- Row 1: Corporation & Project Details -->
          <div class="flex flex-col">
            <div class="mb-3">
              <!-- Single Card with All Project Details -->
              <UCard variant="soft">
                <!-- Unified grid with labels and icons -->
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <!-- Skeleton Loaders -->
                  <template v-if="loading">
                    <!-- Corporation -->
                    <div class="col-span-1">
                      <USkeleton class="h-3 w-24 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Project Name -->
                    <div>
                      <USkeleton class="h-3 w-28 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Project ID -->
                    <div>
                      <USkeleton class="h-3 w-20 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Project Type -->
                    <div>
                      <USkeleton class="h-3 w-24 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Service Type -->
                    <div>
                      <USkeleton class="h-3 w-24 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Status -->
                    <div>
                      <USkeleton class="h-3 w-16 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Start Date -->
                    <div>
                      <USkeleton class="h-3 w-20 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Estimated Completion Date -->
                    <div>
                      <USkeleton class="h-3 w-40 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Estimated Amount -->
                    <div>
                      <USkeleton class="h-3 w-32 mb-1" />
                      <USkeleton class="h-9 w-full" />
                      <USkeleton class="h-3 w-48 mt-1" />
                    </div>
                    <!-- Contingency % -->
                    <div>
                      <USkeleton class="h-3 w-28 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Area -->
                    <div>
                      <USkeleton class="h-3 w-24 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Rooms -->
                    <div>
                      <USkeleton class="h-3 w-24 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                  </template>
                  
                  <!-- Actual Form Fields -->
                  <template v-else>
                  <!-- Corporation (editable) -->
                  <div class="col-span-1">
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Corporation <span class="text-red-500">*</span>
                    </label>
                    <div 
                      :class="{ 'cursor-not-allowed': isCorporationDisabled }"
                      @click="handleCorporationClick"
                    >
                      <CorporationSelect
                        :model-value="form.corporation_uuid"
                        placeholder="Select corporation"
                        size="sm"
                        class="w-full"
                        :disabled="isCorporationDisabled"
                        @update:model-value="(value) => handleFormUpdate('corporation_uuid', value)"
                        @change="handleCorporationChange"
                      />
                    </div>
                  </div>

                  <!-- Project Name -->
                  <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Project Name <span class="text-red-500">*</span>
                    </label>
                    <UInput
                      v-model="form.project_name"
                      placeholder="Project Name"
                      size="sm"
                      class="w-full"
                      @update:model-value="(value) => handleFormUpdate('project_name', value)"
                    />
                  </div>

                  <!-- Project ID -->
                  <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Project ID <span class="text-red-500">*</span>
                    </label>
                    <UInput
                      :model-value="form.project_id"
                      placeholder="Project ID"
                      size="sm"
                      class="w-full"
                      disabled
                      icon="i-heroicons-hashtag"
                    />
                  </div>

                  <!-- Project Type -->
                  <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Project Type <span class="text-red-500">*</span>
                    </label>
                    <ProjectTypeSelect
                      :model-value="form.project_type_uuid"
                      placeholder="Select project type"
                      size="sm"
                      class="w-full"
                      @update:model-value="handleProjectTypeValueUpdate"
                      @update:modelValue="handleProjectTypeValueUpdate"
                      @change="handleProjectTypeChange"
                    />
                  </div>

                  <!-- Service Type -->
                  <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Service Type <span class="text-red-500">*</span>
                    </label>
                    <ServiceTypeSelect
                      :model-value="form.service_type_uuid"
                      placeholder="Select service type"
                      size="sm"
                      class="w-full"
                      @update:model-value="handleServiceTypeValueUpdate"
                      @update:modelValue="handleServiceTypeValueUpdate"
                      @change="handleServiceTypeChange"
                    />
                  </div>

                  <!-- Status -->
                  <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Status
                    </label>
                    <USelectMenu
                      v-model="form.project_status"
                      :items="projectStatusOptions"
                      placeholder="Select status"
                      size="sm"
                      class="w-full"
                      value-key="value"
                      label-key="label"
                      @update:model-value="(value) => handleFormUpdate('project_status', value)"
                    />
                  </div>

                  <!-- Start Date -->
                  <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Start Date <span class="text-red-500">*</span>
                    </label>
                    <UPopover v-model:open="startDatePopoverOpen">
                      <UButton 
                        color="neutral" 
                        variant="outline" 
                        icon="i-heroicons-calendar-days"
                        class="w-full justify-start"
                        size="sm"
                      >
                        {{ startDateDisplayText }}
                      </UButton>
                      <template #content>
                        <UCalendar v-model="startDateValue" class="p-2" @update:model-value="startDatePopoverOpen = false" />
                      </template>
                    </UPopover>
                  </div>

                  <!-- Estimated Completion Date -->
                  <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Estimated Completion <span class="text-red-500">*</span>
                    </label>
                    <UPopover v-model:open="estimatedCompletionDatePopoverOpen">
                      <UButton 
                        color="neutral" 
                        variant="outline" 
                        icon="i-heroicons-calendar-days"
                        class="w-full justify-start"
                        size="sm"
                      >
                        {{ estimatedCompletionDateDisplayText }}
                      </UButton>
                      <template #content>
                        <UCalendar v-model="estimatedCompletionDateValue" class="p-2" @update:model-value="estimatedCompletionDatePopoverOpen = false" />
                      </template>
                    </UPopover>
                  </div>

                  <!-- Estimated Amount -->
                  <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Estimated Amount
                    </label>
                    <UInput
                      :model-value="estimatedAmountDisplay"
                      size="sm"
                      class="w-full"
                      disabled
                    />
                    <p class="text-xs mt-1" :class="estimateStatusMetadata.class">
                      {{ estimateStatusMetadata.helper }}
                    </p>
                  </div>

                  <!-- Contingency % -->
                  <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Contingency (%) <span class="text-red-500">*</span>
                    </label>
                    <UInput
                      v-model="form.contingency_percentage"
                      type="number"
                      step="0.01"
                      placeholder="%"
                      size="sm"
                      class="w-full"
                      @update:model-value="(value) => handleFormUpdate('contingency_percentage', value)"
                    />
                  </div>

                  <!-- Area + Rooms group with helper text underneath -->
                  <div class="md:col-span-2 xl:col-span-2">
                    <div class="rounded-md bg-primary-50/40 dark:bg-primary-900/10 px-2 py-2">
                      <div class="flex flex-col md:flex-row md:items-end md:gap-3">
                        <!-- Area -->
                        <div class="flex-1">
                          <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                            Area (Sq ft)
                          </label>
                          <UInput
                            v-model="form.area_sq_ft"
                            type="number"
                            placeholder="Area"
                            size="sm"
                            class="w-full"
                            @update:model-value="(value) => handleFormUpdate('area_sq_ft', value)"
                          />
                        </div>

                        <!-- (or) separator -->
                        <div class="flex items-center justify-center text-[10px] text-muted font-medium px-1 py-1">
                          (or)
                        </div>

                        <!-- Rooms -->
                        <div class="flex-1">
                          <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                            No. of Rooms
                          </label>
                          <UInput
                            v-model="form.no_of_rooms"
                            type="number"
                            placeholder="Rooms"
                            size="sm"
                            class="w-full"
                            @update:model-value="(value) => handleFormUpdate('no_of_rooms', value)"
                          />
                        </div>
                      </div>

                      <!-- Helper: either Area or Rooms (spans under both fields) -->
                      <div class="mt-1">
                        <p class="inline-flex items-center gap-1 text-[10px] font-medium text-primary-700 dark:text-primary-200">
                          <UIcon name="i-heroicons-information-circle" class="w-3 h-3" />
                          <span>Enter either Area (Sq ft) or Number of Rooms; you don’t need to fill both.</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  </template>
                </div>
              </UCard>
            </div>
          </div>

          <!-- Row 2: Project Options & Address Details -->
          <div class="flex flex-col flex-1">
            <div class="mb-3 space-y-4 h-full">
              <!-- Project Options Section -->
              <UCard variant="soft">
                <template v-if="loading">
                  <USkeleton class="h-6 w-32 mb-4" />
                  <div class="flex items-center justify-between">
                    <USkeleton class="h-10 w-32" />
                    <USkeleton class="h-10 w-48" />
                  </div>
                </template>
                <template v-else>
                <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <UIcon name="i-heroicons-cog-6-tooth-solid" class="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  Project Layout
                </h4>
                <div class="flex items-center justify-between">
                  <!-- Only Total -->
                  <div 
                    class="flex items-center p-3 rounded-lg transition-all duration-200"
                    :class="form.only_total 
                      ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'"
                  >
                    <UCheckbox
                      v-model="form.only_total"
                      label="Only Total"
                      class="text-sm"
                      @update:model-value="(value) => handleOnlyTotalChange(value)"
                    />
                  </div>
                  <!-- Enable Columns -->
                  <div 
                    class="flex items-center gap-6 p-3 rounded-lg transition-all duration-200"
                    :class="(form.enable_labor || form.enable_material)
                      ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'"
                  >
                    <span class="text-sm font-medium text-default">Enable Columns:</span>
                    <UCheckbox
                      v-model="form.enable_labor"
                      label="Labor"
                      class="text-sm"
                      @update:model-value="(value) => handleLaborChange(value)"
                    />
                    <UCheckbox
                      v-model="form.enable_material"
                      label="Material"
                      class="text-sm"
                      @update:model-value="(value) => handleMaterialChange(value)"
                    />
                  </div>
                </div>
                </template>
              </UCard>

              <!-- Address Management Section -->
              <UCard variant="soft">
                <template v-if="loading">
                  <div class="flex items-center justify-between mb-3">
                    <USkeleton class="h-6 w-48" />
                    <USkeleton class="h-8 w-40" />
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <div v-for="i in 4" :key="i" class="p-3 rounded-md border-2 border-default">
                      <USkeleton class="h-4 w-32 mb-2" />
                      <USkeleton class="h-3 w-24 mb-1" />
                      <USkeleton class="h-3 w-20 mb-2" />
                      <USkeleton class="h-3 w-16 mb-2" />
                      <USkeleton class="h-6 w-full mt-2" />
                    </div>
                  </div>
                </template>
                <template v-else>
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                    <UIcon name="i-heroicons-map-pin-solid" class="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    Project Contacts / Addresses
                  </h4>
                  <UButton
                    icon="i-heroicons-plus"
                    size="xs"
                    color="primary"
                    :disabled="!canManageAddresses"
                    @click="openAddressModal"
                  >
                    Add Contact / Address
                  </UButton>
                </div>
                
                <!-- Addresses grouped by type -->
                <div v-if="projectAddresses && projectAddresses.length > 0" class="space-y-6">
                  <!-- Shipment Addresses Row -->
                  <div v-if="shipmentAddresses.length > 0">
                    <div class="flex items-center gap-2 mb-3">
                      <UIcon name="i-heroicons-truck" class="w-4 h-4 text-info" />
                      <h5 class="text-sm font-semibold text-default">Shipment Addresses</h5>
                      <UBadge color="info" variant="soft" size="xs">{{ shipmentAddresses.length }}</UBadge>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      <div
                        v-for="address in shipmentAddresses"
                        :key="address.uuid || address.tempId"
                        class="relative p-3 rounded-md border-2 transition-all duration-200 cursor-pointer"
                        :class="address.is_primary 
                          ? 'bg-gradient-to-br from-brand-50 to-brand-100 border-brand-300 shadow-sm dark:from-brand-900/20 dark:to-brand-900/20 dark:border-brand-400' 
                          : 'bg-elevated border-default hover:border-accented hover:shadow-sm'"
                        @click="setPrimaryAddress(address)"
                      >
                        <!-- Radio button for primary selection -->
                        <div class="absolute top-2 right-2">
                          <input
                            type="radio"
                            :id="`primary-${address.uuid || address.tempId}`"
                            name="primary-address-shipment"
                            :checked="address.is_primary"
                            @change="setPrimaryAddress(address)"
                            class="w-3 h-3 text-brand-600 bg-elevated border-default focus:ring-brand-500 focus:ring-1"
                          />
                        </div>
                        
                        <!-- Address content -->
                        <div class="pr-6">
                          <!-- Header with address -->
                          <div class="flex items-start justify-between mb-1">
                            <div class="flex-1 min-w-0">
                              <div class="text-xs font-medium text-default truncate">{{ address.address_line_1 }}</div>
                              <div v-if="address.address_line_2" class="text-xs text-muted truncate">{{ address.address_line_2 }}</div>
                            </div>
                          </div>
                          
                          <!-- Location info -->
                          <div class="text-xs text-muted mb-1 truncate">
                            {{ [address.city, address.state, address.zip_code].filter(Boolean).join(', ') }}
                          </div>
                          <div v-if="address.country" class="text-xs text-muted mb-2 truncate">{{ getCountryName(address.country) }}</div>
                          
                          <!-- Contact info -->
                          <div class="space-y-0.5">
                            <div v-if="address.contact_person" class="text-xs text-muted truncate">
                              <UIcon name="i-heroicons-user" class="w-3 h-3 inline mr-1" />
                              {{ address.contact_person }}
                            </div>
                            <div v-if="address.phone" class="text-xs text-muted truncate">
                              <UIcon name="i-heroicons-phone" class="w-3 h-3 inline mr-1" />
                              {{ address.phone }}
                            </div>
                            <div v-if="address.email" class="text-xs text-muted truncate">
                              <UIcon name="i-heroicons-envelope" class="w-3 h-3 inline mr-1" />
                              {{ address.email }}
                            </div>
                          </div>
                        </div>
                        
                        <!-- Action buttons -->
                        <div class="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-default">
                          <UButton
                            icon="tdesign:edit-filled"
                            size="xs"
                            color="secondary"
                            variant="soft"
                            class="p-1 h-6 w-6"
                            @click.stop="editAddress(address)"
                          />
                          <UButton
                            icon="mingcute:delete-fill"
                            size="xs"
                            variant="soft"
                            color="error"
                            class="p-1 h-6 w-6"
                            @click.stop="deleteAddress(address)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Billing Addresses Row -->
                  <div v-if="billingAddresses.length > 0">
                    <div class="flex items-center gap-2 mb-3">
                      <UIcon name="i-heroicons-credit-card" class="w-4 h-4 text-warning" />
                      <h5 class="text-sm font-semibold text-default">Billing Addresses</h5>
                      <UBadge color="warning" variant="soft" size="xs">{{ billingAddresses.length }}</UBadge>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      <div
                        v-for="address in billingAddresses"
                        :key="address.uuid || address.tempId"
                        class="relative p-3 rounded-md border-2 transition-all duration-200 cursor-pointer"
                        :class="address.is_primary 
                          ? 'bg-gradient-to-br from-brand-50 to-brand-100 border-brand-300 shadow-sm dark:from-brand-900/20 dark:to-brand-900/20 dark:border-brand-400' 
                          : 'bg-elevated border-default hover:border-accented hover:shadow-sm'"
                        @click="setPrimaryAddress(address)"
                      >
                        <!-- Radio button for primary selection -->
                        <div class="absolute top-2 right-2">
                          <input
                            type="radio"
                            :id="`primary-${address.uuid || address.tempId}`"
                            name="primary-address-bill"
                            :checked="address.is_primary"
                            @change="setPrimaryAddress(address)"
                            class="w-3 h-3 text-brand-600 bg-elevated border-default focus:ring-brand-500 focus:ring-1"
                          />
                        </div>
                        
                        <!-- Address content -->
                        <div class="pr-6">
                          <!-- Header with address -->
                          <div class="flex items-start justify-between mb-1">
                            <div class="flex-1 min-w-0">
                              <div class="text-xs font-medium text-default truncate">{{ address.address_line_1 }}</div>
                              <div v-if="address.address_line_2" class="text-xs text-muted truncate">{{ address.address_line_2 }}</div>
                            </div>
                          </div>
                          
                          <!-- Location info -->
                          <div class="text-xs text-muted mb-1 truncate">
                            {{ [address.city, address.state, address.zip_code].filter(Boolean).join(', ') }}
                          </div>
                          <div v-if="address.country" class="text-xs text-muted mb-2 truncate">{{ getCountryName(address.country) }}</div>
                          
                          <!-- Contact info -->
                          <div class="space-y-0.5">
                            <div v-if="address.contact_person" class="text-xs text-muted truncate">
                              <UIcon name="i-heroicons-user" class="w-3 h-3 inline mr-1" />
                              {{ address.contact_person }}
                            </div>
                            <div v-if="address.phone" class="text-xs text-muted truncate">
                              <UIcon name="i-heroicons-phone" class="w-3 h-3 inline mr-1" />
                              {{ address.phone }}
                            </div>
                            <div v-if="address.email" class="text-xs text-muted truncate">
                              <UIcon name="i-heroicons-envelope" class="w-3 h-3 inline mr-1" />
                              {{ address.email }}
                            </div>
                          </div>
                        </div>
                        
                        <!-- Action buttons -->
                        <div class="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-default">
                          <UButton
                            icon="tdesign:edit-filled"
                            size="xs"
                            color="secondary"
                            variant="soft"
                            class="p-1 h-6 w-6"
                            @click.stop="editAddress(address)"
                          />
                          <UButton
                            icon="mingcute:delete-fill"
                            size="xs"
                            variant="soft"
                            color="error"
                            class="p-1 h-6 w-6"
                            @click.stop="deleteAddress(address)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Final Destination Addresses Row -->
                  <div v-if="finalDestinationAddresses.length > 0">
                    <div class="flex items-center gap-2 mb-3">
                      <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-success" />
                      <h5 class="text-sm font-semibold text-default">Final Destination Addresses</h5>
                      <UBadge color="success" variant="soft" size="xs">{{ finalDestinationAddresses.length }}</UBadge>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      <div
                        v-for="address in finalDestinationAddresses"
                        :key="address.uuid || address.tempId"
                        class="relative p-3 rounded-md border-2 transition-all duration-200 cursor-pointer"
                        :class="address.is_primary 
                          ? 'bg-gradient-to-br from-brand-50 to-brand-100 border-brand-300 shadow-sm dark:from-brand-900/20 dark:to-brand-900/20 dark:border-brand-400' 
                          : 'bg-elevated border-default hover:border-accented hover:shadow-sm'"
                        @click="setPrimaryAddress(address)"
                      >
                        <!-- Radio button for primary selection -->
                        <div class="absolute top-2 right-2">
                          <input
                            type="radio"
                            :id="`primary-${address.uuid || address.tempId}`"
                            name="primary-address-final-destination"
                            :checked="address.is_primary"
                            @change="setPrimaryAddress(address)"
                            class="w-3 h-3 text-brand-600 bg-elevated border-default focus:ring-brand-500 focus:ring-1"
                          />
                        </div>
                        
                        <!-- Address content -->
                        <div class="pr-6">
                          <!-- Header with address -->
                          <div class="flex items-start justify-between mb-1">
                            <div class="flex-1 min-w-0">
                              <div class="text-xs font-medium text-default truncate">{{ address.address_line_1 }}</div>
                              <div v-if="address.address_line_2" class="text-xs text-muted truncate">{{ address.address_line_2 }}</div>
                            </div>
                          </div>
                          
                          <!-- Location info -->
                          <div class="text-xs text-muted mb-1 truncate">
                            {{ [address.city, address.state, address.zip_code].filter(Boolean).join(', ') }}
                          </div>
                          <div v-if="address.country" class="text-xs text-muted mb-2 truncate">{{ getCountryName(address.country) }}</div>
                          
                          <!-- Contact info -->
                          <div class="space-y-0.5">
                            <div v-if="address.contact_person" class="text-xs text-muted truncate">
                              <UIcon name="i-heroicons-user" class="w-3 h-3 inline mr-1" />
                              {{ address.contact_person }}
                            </div>
                            <div v-if="address.phone" class="text-xs text-muted truncate">
                              <UIcon name="i-heroicons-phone" class="w-3 h-3 inline mr-1" />
                              {{ address.phone }}
                            </div>
                            <div v-if="address.email" class="text-xs text-muted truncate">
                              <UIcon name="i-heroicons-envelope" class="w-3 h-3 inline mr-1" />
                              {{ address.email }}
                            </div>
                          </div>
                        </div>
                        
                        <!-- Action buttons -->
                        <div class="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-default">
                          <UButton
                            icon="tdesign:edit-filled"
                            size="xs"
                            color="secondary"
                            variant="soft"
                            class="p-1 h-6 w-6"
                            @click.stop="editAddress(address)"
                          />
                          <UButton
                            icon="mingcute:delete-fill"
                            size="xs"
                            variant="soft"
                            color="error"
                            class="p-1 h-6 w-6"
                            @click.stop="deleteAddress(address)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- No addresses message -->
                <div v-else class="flex flex-col items-center justify-center text-muted p-8">
                  <UIcon name="i-heroicons-map-pin" class="w-12 h-12 mb-3 text-muted" />
                  <p class="text-sm font-medium mb-1">No addresses added</p>
                  <p class="text-xs text-muted text-center">
                    {{ canManageAddresses ? 'Click "Add Address" to create one' : 'Fill Basic Information and Project Configuration first' }}
                  </p>
                </div>
                </template>
              </UCard>
            </div>
          </div>

        </div>
      </div>

      <!-- Right Panel: File Upload Only -->
      <div ref="rightPanel" class="w-80 flex flex-col min-h-0 border-l border-default pl-4" style="min-width: 250px;">
        <!-- Upload Section -->
        <div class="mb-3">
          <UCard variant="soft">
          <!-- Skeleton Loaders for Upload Section -->
          <template v-if="loading">
            <div class="flex justify-between items-center mb-3">
              <USkeleton class="h-6 w-32" />
              <USkeleton class="h-6 w-24" />
            </div>
            <div class="space-y-2">
              <USkeleton class="h-10 w-full" />
              <USkeleton class="h-4 w-full" />
            </div>
          </template>
          
          <!-- Actual Upload Section -->
          <template v-else>
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
              <UIcon name="i-heroicons-cloud-arrow-up-solid" class="w-5 h-5 text-brand-600 dark:text-brand-400" />
              File Upload
            </h4>
            <span class="text-xs text-muted bg-elevated px-2 py-1 rounded border border-default">
              {{ form.attachments.length }} files
              <span v-if="form.attachments.filter((att: any) => att.uuid || att.isUploaded).length > 0" class="text-green-600">
                ({{ form.attachments.filter((att: any) => att.uuid || att.isUploaded).length }} uploaded)
              </span>
            </span>
          </div>
          
          <UFileUpload 
            v-slot="{ open, removeFile }" 
            v-model="uploadedFiles" 
            accept=".pdf,.doc,.docx"
            multiple
            :key="fileInputKey"
          >
            <div class="space-y-2">
              <UButton
                :label="uploadedFiles.length > 0 ? 'Add more files' : 'Choose files'"
                color="primary"
                variant="solid"
                size="sm"
                icon="i-heroicons-document-plus"
                @click="open()"
              />
              
              <p v-if="fileUploadErrorMessage" class="text-xs text-red-600 flex items-center gap-1 p-2 bg-red-50 rounded border border-red-200">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3 flex-shrink-0" />
                <span class="truncate">{{ fileUploadErrorMessage }}</span>
              </p>
              
              <p class="text-xs text-muted text-center">PDF, DOC, DOCX (Max 10MB each)</p>
            </div>
          </UFileUpload>
          </template>
          </UCard>
        </div>
        
        <!-- File List Section -->
        <div class="flex-1 overflow-hidden">
          <UCard variant="soft" class="h-full">
            <!-- Skeleton Loaders for File List -->
            <template v-if="loading">
              <div class="flex justify-between items-center mb-3">
                <USkeleton class="h-6 w-32" />
              </div>
              <div class="space-y-2">
                <div v-for="i in 3" :key="i" class="flex items-center gap-2 p-2 bg-elevated rounded-md border border-default">
                  <USkeleton class="h-3 w-3 rounded-full" />
                  <USkeleton class="h-4 w-32 flex-1" />
                  <USkeleton class="h-6 w-6" />
                  <USkeleton class="h-6 w-6" />
                </div>
              </div>
            </template>
            
            <!-- Actual File List -->
            <template v-else>
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                <UIcon name="i-heroicons-document-text-solid" class="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Uploaded Files
              </h4>
            </div>
          
            <div v-if="!props.form.attachments || props.form.attachments.length === 0" class="flex flex-col items-center justify-center h-full text-muted p-6">
              <UIcon name="i-heroicons-document" class="w-16 h-16 mb-4 text-muted" />
              <p class="text-sm font-medium text-muted mb-2">No files uploaded</p>
              <p class="text-xs text-muted text-center">Upload files above to see them here</p>
            </div>

            <div v-else class="h-full overflow-y-auto">
              <div class="space-y-2">
                <div v-for="(attachment, index) in props.form.attachments" :key="attachment.uuid || attachment.tempId || index" 
                     class="flex items-center gap-2 p-2 bg-elevated rounded-md border border-default text-xs hover:bg-accented transition-colors">
                  <UIcon name="i-heroicons-check-circle" class="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span class="truncate flex-1 text-default">{{ attachment.document_name || attachment.name || `File ${index + 1}` }}</span>
                  <div class="flex items-center gap-1">
                    <UButton
                      icon="i-heroicons-eye-solid"
                      color="neutral"
                      variant="soft"
                      size="xs"
                      class="p-1 h-auto text-xs"
                      @click="previewFile(attachment)"
                      @click.stop
                    />
                    <UButton
                      icon="mingcute:delete-fill"
                      color="error"
                      variant="soft"
                      size="xs"
                      class="p-1 h-auto text-xs"
                      @click="removeFile(index)"
                    />
                  </div>
                </div>
              </div>
            </div>
            </template>
          </UCard>
        </div>
      </div>
    </div>

    <!-- Address Modal -->
    <UModal v-model:open="showAddressModal" :ui="{ body: 'sm:p-4 flex-1 overflow-y-auto p-3' }">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold">{{ editingAddress ? 'Edit Address' : 'Add Address' }}</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeAddressModal" />
        </div>
      </template>
      <template #body>
        <form class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Address Type
              </label>
              <div class="flex items-end gap-3">
                <USelect
                  :items="addressTypeOptions"
                  placeholder="Select address type"
                  size="sm"
                  class="flex-1"
                  value-attribute="value"
                  option-attribute="label"
                  :model-value="addressForm.address_type || undefined"
                  @update:model-value="(value) => addressForm.address_type = value || null"
                />
                <UCheckbox
                  v-if="showSameAsBillingCheckbox"
                  v-model="sameAsBillingAddress"
                  label="Same as billing address"
                  class="flex-shrink-0 mb-0"
                  @update:model-value="handleSameAsBillingChange"
                />
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Contact Person
              </label>
              <UInput
                v-model="addressForm.contact_person"
                placeholder="Contact person name"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Phone
              </label>
              <UInput
                v-model="addressForm.phone"
                placeholder="Phone number"
                size="sm"
                class="w-full"
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Email
            </label>
            <UInput
              v-model="addressForm.email"
              type="email"
              placeholder="Email address"
              size="sm"
              class="w-full"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Country
            </label>
            <USelect
              v-model="addressForm.country"
              :items="countryOptions"
              placeholder="Select Country"
              searchable
              size="sm"
              class="w-full"
              value-attribute="value"
              option-attribute="label"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Address Line 1 <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="addressForm.address_line_1"
              placeholder="Street address, P.O. box, company name, c/o"
              size="sm"
              class="w-full"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Address Line 2
            </label>
            <UInput
              v-model="addressForm.address_line_2"
              placeholder="Apartment, suite, unit, building, floor, etc."
              size="sm"
              class="w-full"
            />
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                City
              </label>
              <UInput
                v-model="addressForm.city"
                placeholder="City"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                State/Province
              </label>
              <UInput
                v-model="addressForm.state"
                placeholder="State/Province"
                size="sm"
                class="w-full"
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              ZIP/Postal Code
            </label>
            <UInput
              v-model="addressForm.zip_code"
              placeholder="ZIP/Postal Code"
              size="sm"
              class="w-full"
            />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton variant="solid" color="neutral" @click="closeAddressModal" :disabled="isSavingAddress">Cancel</UButton>
          <UButton variant="solid" color="primary" @click="saveAddress" :loading="isSavingAddress" :disabled="isSavingAddress">
            {{ editingAddress ? 'Update' : 'Create' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- File Preview Modal -->
    <UModal v-model:open="showFilePreviewModal">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold">File Preview</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeFilePreview" />
        </div>
      </template>
      <template #body>
        <div class="h-[70vh]">
          <FilePreview :attachment="selectedFileForPreview" />
        </div>
      </template>
    </UModal>

    <!-- Audit Log Modal -->
    <AuditLogModal
      v-model:open="showAuditLogModal"
      :entity-id="form.id || ''"
      entity-type="project"
      :corporation-uuid="corpStore.selectedCorporation?.uuid || ''"
      :bill-info="projectInfo"
      :auto-refresh="true"
      @logs-loaded="onAuditLogsLoaded"
      @error="onAuditLogError"
      @export="onExportAuditLogs"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { CalendarDate, DateFormatter, getLocalTimeZone } from "@internationalized/date";
import { useCorporationStore } from "@/stores/corporations";
import { useProjectTypesStore } from "@/stores/projectTypes";
import { useServiceTypesStore } from "@/stores/serviceTypes";
import { useProjectAddressesStore, type ProjectAddress } from "@/stores/projectAddresses";
import { useProjectsStore } from "@/stores/projects";
import { useAuditLog } from '@/composables/useAuditLog';
import { useUTCDateFormat } from '@/composables/useUTCDateFormat';
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';
import AuditLogModal from '@/components/AuditLogs/AuditLogModal.vue';
import FilePreview from '@/components/Shared/FilePreview.vue';
import ProjectTypeSelect from '@/components/Shared/ProjectTypeSelect.vue';
import ServiceTypeSelect from '@/components/Shared/ServiceTypeSelect.vue';
import CorporationSelect from '@/components/Shared/CorporationSelect.vue';

// Props
interface Props {
  form: any;
  editingProject: boolean;
  fileUploadError?: string | null;
  latestEstimate?: any | null;
  loading?: boolean;
  hasProjectEstimates?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  fileUploadError: null,
  latestEstimate: null,
  loading: false,
  hasProjectEstimates: false,
});

// Emits
const emit = defineEmits<{
  'update:form': [value: any];
  'file-upload': [files: File[]];
  'validation-change': [isValid: boolean];
  'save-temp-addresses': [projectUuid: string, tempAddresses: any[]];
}>();

// Stores
const corpStore = useCorporationStore();
const projectTypesStore = useProjectTypesStore();
const serviceTypesStore = useServiceTypesStore();
const projectAddressesStore = useProjectAddressesStore();
const projectsStore = useProjectsStore();

// Currency formatting
const { formatCurrency } = useCurrencyFormat();
const { toUTCString, fromUTCString } = useUTCDateFormat();

// Audit log functionality
const { 
  showAuditLogModal, 
  generateAuditLogInfo, 
  showAuditLog, 
  onAuditLogsLoaded, 
  onAuditLogError, 
  onExportAuditLogs 
} = useAuditLog({
  entityType: 'project',
  corporationUuid: computed(() => corpStore.selectedCorporation?.uuid || ''),
  formatCurrency: (amount: number | string | undefined) => {
    if (amount === null || amount === undefined || amount === '') {
      return '$0.00';
    }
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) {
      return '$0.00';
    }
    return `$${numAmount.toFixed(2)}`;
  }
});

// File upload functionality
const uploadedFiles = ref<File[]>([]);
const fileUploadError = ref<string | null>(null);
const fileInputKey = ref(0); // Key to force re-render of file input

// File preview functionality
const showFilePreviewModal = ref(false);
const startDatePopoverOpen = ref(false);
const estimatedCompletionDatePopoverOpen = ref(false);
const selectedFileForPreview = ref<any>(null);

// Address management functionality
const showAddressModal = ref(false);
const editingAddress = ref(false);
const editingAddressUuid = ref<string | null>(null);
const editingAddressIndex = ref<number | null>(null);
const isSavingAddress = ref(false);
const addressForm = ref({
  address_type: null as string | null,
  contact_person: '',
  email: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  zip_code: '',
  country: '',
  copied_from_billing_address_uuid: null as string | null
});

const sameAsBillingAddress = ref(false);

// Show checkbox only when address type is 'shipment' or 'final-destination'
const showSameAsBillingCheckbox = computed(() => {
  return addressForm.value.address_type === 'shipment' || addressForm.value.address_type === 'final-destination';
});

// Handle checkbox change - copy primary billing address fields
const handleSameAsBillingChange = async (checked: boolean) => {
  if (checked) {
    try {
      let billingAddress: any = null;
      
      if (props.form.id) {
        // Project is saved - fetch from store
        const addresses = projectAddressesStore.getAddresses(props.form.id);
        if (!addresses || addresses.length === 0) {
          await projectAddressesStore.fetchAddresses(props.form.id);
        }
        const allBillingAddresses = projectAddressesStore.getAddresses(props.form.id)
          .filter((addr: any) => addr.address_type === 'bill');
        
        // Find primary billing address first, fallback to any billing address
        billingAddress = allBillingAddresses.find((addr: any) => addr.is_primary) 
          || allBillingAddresses[0];
      } else {
        // Project is not saved yet - check temporary addresses
        const tempAddresses = props.form.tempAddresses || [];
        const allBillingAddresses = tempAddresses.filter((addr: any) => addr.address_type === 'bill');
        
        // Find primary billing address first, fallback to any billing address
        billingAddress = allBillingAddresses.find((addr: any) => addr.is_primary)
          || allBillingAddresses[0];
      }
      
      if (billingAddress) {
        // Copy primary billing address fields exactly as they are
        addressForm.value.contact_person = billingAddress.contact_person || '';
        addressForm.value.email = billingAddress.email || '';
        addressForm.value.phone = billingAddress.phone || '';
        addressForm.value.address_line_1 = billingAddress.address_line_1 || '';
        addressForm.value.address_line_2 = billingAddress.address_line_2 || '';
        addressForm.value.city = billingAddress.city || '';
        addressForm.value.state = billingAddress.state || '';
        addressForm.value.zip_code = billingAddress.zip_code || '';
        addressForm.value.country = billingAddress.country || '';
        
        // Store the UUID of the billing address that was copied
        // Use uuid for saved addresses, tempId for temporary addresses
        addressForm.value.copied_from_billing_address_uuid = billingAddress.uuid || billingAddress.tempId || null;
      } else {
        // No billing address found, uncheck the checkbox
        sameAsBillingAddress.value = false;
        addressForm.value.copied_from_billing_address_uuid = null;
        const toast = useToast();
        toast.add({
          title: 'No Billing Address',
          description: 'No billing address found for this project. Please create a billing address first.',
          color: 'warning',
          icon: 'i-heroicons-exclamation-triangle'
        });
      }
    } catch (error) {
      console.error('Error fetching billing address:', error);
      sameAsBillingAddress.value = false;
      addressForm.value.copied_from_billing_address_uuid = null;
    }
  } else if (!checked) {
    // When unchecked, clear the copied_from_billing_address_uuid but don't clear the fields
    // User may have edited them and wants to keep the values
    addressForm.value.copied_from_billing_address_uuid = null;
  }
};

// Watch address type changes to reset checkbox if needed
watch(() => addressForm.value.address_type, (newType) => {
  if (newType !== 'shipment' && newType !== 'final-destination') {
    sameAsBillingAddress.value = false;
    addressForm.value.copied_from_billing_address_uuid = null;
  }
});

// Computed property to handle parent error precedence
const fileUploadErrorMessage = computed(() => {
  return props.fileUploadError || fileUploadError.value;
});

// Panel references
const leftPanel = ref<HTMLElement | null>(null);  // Left panel containing 3 rows in column layout
const rightPanel = ref<HTMLElement | null>(null); // Right panel: File Upload

// Corporation change handler
const handleCorporationChange = (corporation: any) => {
  if (corporation && corporation.value) {
    handleFormUpdate('corporation_uuid', corporation.value);
    // Auto-generate Project ID on corporation selection if not set
    if (corporation.value && !props.editingProject) {
      generateProjectId();
    }
  }
};

// Handle click on corporation selector when disabled
const handleCorporationClick = (event: MouseEvent) => {
  if (isCorporationDisabled.value) {
    // Prevent any interaction
    event.preventDefault();
    event.stopPropagation();
    
    // Show toast message
    const toast = useToast();
    toast.add({
      title: 'Cannot Change Corporation',
      description: 'Corporation cannot be changed when estimates exist for this project.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
  }
};

// Generate next Project ID with pattern PRO-<n>, starting at 1
const generateProjectId = async () => {
  // Do not override if already set (e.g., editing)
  if (props.form.project_id && String(props.form.project_id).trim() !== '') return;
  const corporationId = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid || corpStore.selectedCorporationId;
  if (!corporationId) return;

  // Ensure projects metadata is loaded for the corporation
  await projectsStore.fetchProjectsMetadata(corporationId);

  // Get existing projects for the corporation
  const existing = (projectsStore.projectsMetadata || []).filter((project: any) => project.corporation_uuid === corporationId);
  let maxNum = 0;
  for (const project of existing) {
    const num = parseInt(String(project.project_id || '').replace(/^PRO-/i, ''), 10);
    if (!isNaN(num)) maxNum = Math.max(maxNum, num);
  }
  const next = maxNum + 1;
  handleFormUpdate('project_id', `PRO-${next}`);
};

// Date formatter for display
const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
});

// Date computed properties for UCalendar
const startDateValue = computed({
  get: () => {
    if (!props.form.project_start_date) return null;
    // Accept either UTC ISO or local YYYY-MM-DD in form state
    const src = String(props.form.project_start_date);
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
      const dateString = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
      // Persist as UTC ISO for storage
      handleFormUpdate('project_start_date', toUTCString(dateString));
    } else {
      handleFormUpdate('project_start_date', null);
    }
  }
});

const estimatedCompletionDateValue = computed({
  get: () => {
    if (!props.form.project_estimated_completion_date) return null;
    const src = String(props.form.project_estimated_completion_date);
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
      const dateString = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
      handleFormUpdate('project_estimated_completion_date', toUTCString(dateString));
    } else {
      handleFormUpdate('project_estimated_completion_date', null);
    }
  }
});

// Display text for date inputs
const startDateDisplayText = computed(() => {
  if (!startDateValue.value) return 'Select start date';
  return df.format(startDateValue.value.toDate(getLocalTimeZone()));
});

const estimatedCompletionDateDisplayText = computed(() => {
  if (!estimatedCompletionDateValue.value) return 'Select completion date';
  return df.format(estimatedCompletionDateValue.value.toDate(getLocalTimeZone()));
});


const projectInfo = computed(() => {
  // Ensure form data is properly formatted for audit log
  const safeForm = {
    ...props.form,
    // Ensure numeric fields are properly handled
    estimated_amount: props.form.estimated_amount ? String(props.form.estimated_amount) : '0',
    area_sq_ft: props.form.area_sq_ft ? String(props.form.area_sq_ft) : '0',
    no_of_rooms: props.form.no_of_rooms ? String(props.form.no_of_rooms) : '0',
    contingency_percentage: props.form.contingency_percentage ? String(props.form.contingency_percentage) : '0'
  };
  return generateAuditLogInfo(safeForm);
});

// Project addresses computed property - combines saved addresses with temporary ones
const projectAddresses = computed(() => {
  const saved = props.form.id ? (projectAddressesStore.getAddresses(props.form.id) || []) : [];
  const savedAddresses = Array.isArray(saved) ? [...saved] : [];
  const tempAddresses = Array.isArray(props.form.tempAddresses) ? [...props.form.tempAddresses] : [];
  return [...savedAddresses, ...tempAddresses];
});

// Group addresses by type
const shipmentAddresses = computed(() => {
  return projectAddresses.value.filter(addr => addr.address_type === 'shipment');
});

const billingAddresses = computed(() => {
  return projectAddresses.value.filter(addr => addr.address_type === 'bill');
});

const finalDestinationAddresses = computed(() => {
  return projectAddresses.value.filter(addr => addr.address_type === 'final-destination');
});

const estimateStatusMetadata = computed(() => {
  const statusCopy: Record<string, { label: string; helper: string; class: string }> = {
    Draft: {
      label: 'Drafting...',
      helper: 'Latest estimate is still a draft. Continue refining it in Estimates.',
      class: 'text-amber-600'
    },
    Ready: {
      label: 'Ready for approval',
      helper: 'Latest estimate is ready for approval. Review it in Estimates.',
      class: 'text-blue-600'
    },
    Approved: {
      label: 'Approved',
      helper: 'Latest estimate has been approved.',
      class: 'text-green-600'
    }
  };

  if (props.latestEstimate) {
    const status = props.latestEstimate.status || 'Draft';
    const copy = statusCopy[status] || {
      label: status || 'Estimate',
      helper: `Latest estimate status: ${status || 'Unknown'}.`,
      class: 'text-gray-600'
    };
    const finalAmount = props.latestEstimate.final_amount ?? props.form.estimated_amount ?? 0;
    return {
      ...copy,
      amount: formatCurrency(finalAmount),
      hasEstimate: true
    };
  }

  const numericAmount = Number(props.form.estimated_amount || 0);
  if (numericAmount > 0) {
    return {
      label: 'Manual amount',
      helper: 'This value was entered manually. Approve an estimate to sync this total automatically.',
      class: 'text-gray-600',
      amount: formatCurrency(numericAmount),
      hasEstimate: false
    };
  }

  const helperMessage = props.editingProject
    ? 'No estimate has been created for this project yet. Create an estimate to populate this total automatically.'
    : 'After you create the project, add an estimate to populate this total automatically.';

  return {
    label: 'No estimate yet',
    helper: helperMessage,
    class: 'text-gray-500',
    amount: '',
    hasEstimate: false
  };
});

const estimatedAmountDisplay = computed(() => {
  const meta = estimateStatusMetadata.value;
  if (meta.amount) {
    return `${meta.label} - ${meta.amount}`;
  }
  return meta.label;
});

// Gate: allow managing addresses only when basic info and configuration are filled
const canManageAddresses = computed(() => {
  const f = props.form;
  const hasBasic = !!(f.project_name && f.project_id);
  const hasConfig = !!(f.project_type_uuid && f.service_type_uuid);
  return hasBasic && hasConfig;
});

// Disable corporation select when estimates exist for the project
const isCorporationDisabled = computed(() => {
  // Only disable when editing an existing project that has estimates
  return props.editingProject && props.hasProjectEstimates;
});

// Method to set primary address (one per address type)
const setPrimaryAddress = async (selectedAddress: any) => {
  try {
    if (props.form.id) {
      // Project is saved, update via API
      if (selectedAddress.uuid && selectedAddress.address_type) {
        // Update the selected address to primary for its type
        // The API will handle unsetting other primaries of the same type
        await projectAddressesStore.updateAddress({
          uuid: selectedAddress.uuid,
          is_primary: true
        });
        
        // Also update the project's project_address_uuid if this is the first primary
        const allAddresses = projectAddressesStore.getAddresses(props.form.id) || [];
        const primaryAddresses = allAddresses.filter((a: any) => a.is_primary);
        if (primaryAddresses.length > 0 && primaryAddresses[0]?.uuid && !props.form.project_address_uuid) {
          await projectsStore.updateProject({ 
            uuid: props.form.id, 
            project_address_uuid: primaryAddresses[0].uuid 
          } as any);
        }
        
        await projectAddressesStore.fetchAddresses(props.form.id);
      }
    } else {
      // Project is not saved yet, update temporary addresses
      const tempAddresses = [...(props.form.tempAddresses || [])];
      
      // Unset all addresses of the same type as primary first
      if (selectedAddress.address_type) {
        tempAddresses.forEach(addr => {
          if (addr.address_type === selectedAddress.address_type) {
            addr.is_primary = false;
          }
        });
      } else {
        // If no address type, unset all (legacy behavior)
        tempAddresses.forEach(addr => {
          addr.is_primary = false;
        });
      }
      
      // Set the selected address as primary
      const addressIndex = tempAddresses.findIndex(addr => 
        addr.tempId === selectedAddress.tempId || addr.uuid === selectedAddress.uuid
      );
      
      if (addressIndex !== -1) {
        tempAddresses[addressIndex].is_primary = true;
        emit('update:form', { ...props.form, tempAddresses });
      }
    }
    
    const toast = useToast();
    toast.add({
      title: 'Success',
      description: 'Primary address updated successfully',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    });
  } catch (error) {
    console.error('Error setting primary address:', error);
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: 'Failed to update primary address',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  }
};

// Helper function to get country name
const getCountryName = (countryCode: string) => {
  const country = countries.find(c => c.code === countryCode);
  return country ? country.name : countryCode;
};

// Helper functions for address type styling
const getAddressTypeColor = (addressType: string): "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral" => {
  const typeColors: Record<string, "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral"> = {
    'shipment': 'info',      // Blue for shipment
    'bill': 'warning',       // Amber for billing
    'final-destination': 'success'  // Green for final destination
  };
  return typeColors[addressType] || 'neutral';
};

const getAddressTypeIcon = (addressType: string) => {
  const typeIcons: Record<string, string> = {
    'shipment': 'i-heroicons-truck',           // Truck for shipment
    'bill': 'i-heroicons-credit-card',         // Credit card for billing
    'final-destination': 'i-heroicons-map-pin' // Map pin for final destination
  };
  return typeIcons[addressType] || 'i-heroicons-map-pin';
};

const getAddressTypeLabel = (addressType: string) => {
  const typeLabels: Record<string, string> = {
    'shipment': 'Shipment',
    'bill': 'Billing',
    'final-destination': 'Final Destination'
  };
  return typeLabels[addressType] || addressType;
};

// Validation for area or rooms requirement
const hasAreaOrRooms = computed(() => {
  const hasArea = props.form.area_sq_ft && props.form.area_sq_ft > 0;
  const hasRooms = props.form.no_of_rooms && props.form.no_of_rooms > 0;
  return hasArea || hasRooms;
});

// Note: projectTypeOptions and serviceTypeOptions are now handled by the reusable components

const projectStatusOptions = [
  { 
    label: "Pending", 
    value: "Pending",
    color: "warning",
    icon: "i-heroicons-clock"
  },
  { 
    label: "Bidding", 
    value: "Bidding",
    color: "info",
    icon: "i-heroicons-document-text"
  },
  { 
    label: "Started", 
    value: "Started",
    color: "primary",
    icon: "i-heroicons-play-circle"
  },
  { 
    label: "In Progress", 
    value: "In Progress",
    color: "info",
    icon: "i-heroicons-play"
  },
  { 
    label: "Completed", 
    value: "Completed",
    color: "success",
    icon: "i-heroicons-check-circle"
  },
  { 
    label: "On Hold", 
    value: "On Hold",
    color: "error",
    icon: "i-heroicons-pause"
  }
];

// Country and currency data
const countries = [
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£' },
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€' },
  { code: 'FR', name: 'France', currency: 'EUR', symbol: '€' },
  { code: 'IT', name: 'Italy', currency: 'EUR', symbol: '€' },
  { code: 'ES', name: 'Spain', currency: 'EUR', symbol: '€' },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$' },
  { code: 'JP', name: 'Japan', currency: 'JPY', symbol: '¥' },
  { code: 'CN', name: 'China', currency: 'CNY', symbol: '¥' },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', symbol: '$' },
  { code: 'RU', name: 'Russia', currency: 'RUB', symbol: '₽' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', symbol: '₩' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', symbol: 'HK$' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', symbol: 'CHF' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', symbol: 'kr' },
  { code: 'NO', name: 'Norway', currency: 'NOK', symbol: 'kr' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', symbol: 'kr' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', symbol: '€' },
  { code: 'BE', name: 'Belgium', currency: 'EUR', symbol: '€' },
  { code: 'AT', name: 'Austria', currency: 'EUR', symbol: '€' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', symbol: '€' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', symbol: '€' },
  { code: 'FI', name: 'Finland', currency: 'EUR', symbol: '€' },
  { code: 'GR', name: 'Greece', currency: 'EUR', symbol: '€' },
  { code: 'PL', name: 'Poland', currency: 'PLN', symbol: 'zł' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', symbol: 'Kč' },
  { code: 'HU', name: 'Hungary', currency: 'HUF', symbol: 'Ft' },
  { code: 'RO', name: 'Romania', currency: 'RON', symbol: 'lei' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN', symbol: 'лв' },
  { code: 'HR', name: 'Croatia', currency: 'EUR', symbol: '€' },
  { code: 'SI', name: 'Slovenia', currency: 'EUR', symbol: '€' },
  { code: 'SK', name: 'Slovakia', currency: 'EUR', symbol: '€' },
  { code: 'LT', name: 'Lithuania', currency: 'EUR', symbol: '€' },
  { code: 'LV', name: 'Latvia', currency: 'EUR', symbol: '€' },
  { code: 'EE', name: 'Estonia', currency: 'EUR', symbol: '€' },
  { code: 'CY', name: 'Cyprus', currency: 'EUR', symbol: '€' },
  { code: 'MT', name: 'Malta', currency: 'EUR', symbol: '€' },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR', symbol: '€' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', symbol: '£' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦' },
  { code: 'KE', name: 'Kenya', currency: 'KES', symbol: 'KSh' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', symbol: '₵' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', symbol: 'د.م.' },
  { code: 'TN', name: 'Tunisia', currency: 'TND', symbol: 'د.ت' },
  { code: 'DZ', name: 'Algeria', currency: 'DZD', symbol: 'د.ج' },
  { code: 'LY', name: 'Libya', currency: 'LYD', symbol: 'ل.د' },
  { code: 'SD', name: 'Sudan', currency: 'SDG', symbol: 'ج.س.' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', symbol: 'Br' },
  { code: 'UG', name: 'Uganda', currency: 'UGX', symbol: 'USh' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', symbol: 'TSh' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL', symbol: 'Z$' },
  { code: 'BW', name: 'Botswana', currency: 'BWP', symbol: 'P' },
  { code: 'NA', name: 'Namibia', currency: 'NAD', symbol: 'N$' },
  { code: 'SZ', name: 'Eswatini', currency: 'SZL', symbol: 'L' },
  { code: 'LS', name: 'Lesotho', currency: 'LSL', symbol: 'L' },
  { code: 'MW', name: 'Malawi', currency: 'MWK', symbol: 'MK' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW', symbol: 'ZK' },
  { code: 'AO', name: 'Angola', currency: 'AOA', symbol: 'Kz' },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN', symbol: 'MT' },
  { code: 'MG', name: 'Madagascar', currency: 'MGA', symbol: 'Ar' },
  { code: 'MU', name: 'Mauritius', currency: 'MUR', symbol: '₨' },
  { code: 'SC', name: 'Seychelles', currency: 'SCR', symbol: '₨' },
  { code: 'KM', name: 'Comoros', currency: 'KMF', symbol: 'CF' },
  { code: 'DJ', name: 'Djibouti', currency: 'DJF', symbol: 'Fdj' },
  { code: 'SO', name: 'Somalia', currency: 'SOS', symbol: 'S' },
  { code: 'ER', name: 'Eritrea', currency: 'ERN', symbol: 'Nfk' },
  { code: 'SS', name: 'South Sudan', currency: 'SSP', symbol: '£' },
  { code: 'CF', name: 'Central African Republic', currency: 'XAF', symbol: 'FCFA' },
  { code: 'TD', name: 'Chad', currency: 'XAF', symbol: 'FCFA' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF', symbol: 'FCFA' },
  { code: 'GQ', name: 'Equatorial Guinea', currency: 'XAF', symbol: 'FCFA' },
  { code: 'GA', name: 'Gabon', currency: 'XAF', symbol: 'FCFA' },
  { code: 'CG', name: 'Congo', currency: 'XAF', symbol: 'FCFA' },
  { code: 'CD', name: 'Democratic Republic of the Congo', currency: 'CDF', symbol: 'FC' },
  { code: 'ST', name: 'São Tomé and Príncipe', currency: 'STN', symbol: 'Db' },
  { code: 'GW', name: 'Guinea-Bissau', currency: 'XOF', symbol: 'CFA' },
  { code: 'GN', name: 'Guinea', currency: 'GNF', symbol: 'FG' },
  { code: 'SL', name: 'Sierra Leone', currency: 'SLE', symbol: 'Le' },
  { code: 'LR', name: 'Liberia', currency: 'LRD', symbol: 'L$' },
  { code: 'CI', name: 'Côte d\'Ivoire', currency: 'XOF', symbol: 'CFA' },
  { code: 'TG', name: 'Togo', currency: 'XOF', symbol: 'CFA' },
  { code: 'BJ', name: 'Benin', currency: 'XOF', symbol: 'CFA' },
  { code: 'NE', name: 'Niger', currency: 'XOF', symbol: 'CFA' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF', symbol: 'CFA' },
  { code: 'ML', name: 'Mali', currency: 'XOF', symbol: 'CFA' },
  { code: 'SN', name: 'Senegal', currency: 'XOF', symbol: 'CFA' },
  { code: 'GM', name: 'Gambia', currency: 'GMD', symbol: 'D' },
  { code: 'CV', name: 'Cape Verde', currency: 'CVE', symbol: '$' },
  { code: 'MR', name: 'Mauritania', currency: 'MRU', symbol: 'UM' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', symbol: '$' },
  { code: 'CL', name: 'Chile', currency: 'CLP', symbol: '$' },
  { code: 'CO', name: 'Colombia', currency: 'COP', symbol: '$' },
  { code: 'PE', name: 'Peru', currency: 'PEN', symbol: 'S/' },
  { code: 'VE', name: 'Venezuela', currency: 'VES', symbol: 'Bs.S' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', symbol: '$U' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG', symbol: '₲' },
  { code: 'BO', name: 'Bolivia', currency: 'BOB', symbol: 'Bs' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', symbol: '$' },
  { code: 'GY', name: 'Guyana', currency: 'GYD', symbol: 'G$' },
  { code: 'SR', name: 'Suriname', currency: 'SRD', symbol: '$' },
  { code: 'FK', name: 'Falkland Islands', currency: 'FKP', symbol: '£' },
  { code: 'GF', name: 'French Guiana', currency: 'EUR', symbol: '€' }
];

// Computed property for country options
const countryOptions = computed(() => 
  countries.map(country => ({
    label: country.name,
    value: country.code,
    currency: country.currency,
    symbol: country.symbol
  }))
);

// Address type options
const addressTypeOptions = [
  { label: 'Shipment Address', value: 'shipment' },
  { label: 'Bill Address', value: 'bill' },
  { label: 'Final Destination', value: 'final-destination' }
];

// Helper functions for currency
const getCurrency = (countryCode: string) => {
  const country = countries.find(c => c.code === countryCode)
  return country ? country.currency : ''
}

const getCurrencySymbol = (countryCode: string) => {
  const country = countries.find(c => c.code === countryCode)
  return country ? country.symbol : ''
}

// Methods
const handleFormUpdate = (field: string, value: any) => {
  console.log('[handleFormUpdate] Called with:', {
    field,
    value,
    valueType: typeof value,
    currentFormValue: props.form[field],
    willUpdate: true
  });
  
  const updatedForm = { ...props.form, [field]: value };
  
  console.log('[handleFormUpdate] Updated form:', {
    field,
    oldValue: props.form[field],
    newValue: updatedForm[field],
    project_type_uuid: updatedForm.project_type_uuid
  });
  
  // Clear the other field when one is filled to avoid confusion
  if (field === 'area_sq_ft' && value && value > 0) {
    updatedForm.no_of_rooms = null;
  } else if (field === 'no_of_rooms' && value && value > 0) {
    updatedForm.area_sq_ft = null;
  }
  
  console.log('[handleFormUpdate] Emitting update:form with project_type_uuid:', updatedForm.project_type_uuid);
  emit('update:form', updatedForm);
};

const handleProjectTypeValueUpdate = (value: string | undefined | any) => {
  console.log('[ProjectType] handleProjectTypeValueUpdate called with:', {
    value,
    valueType: typeof value,
    isString: typeof value === 'string',
    isObject: typeof value === 'object',
    hasValueProp: value && typeof value === 'object' && 'value' in value,
    currentFormValue: props.form.project_type_uuid
  });
  
  // @update:model-value should emit the UUID string, but handle edge cases
  let uuidValue: string = '';
  
  if (typeof value === 'string' && value.trim().length > 0) {
    // Valid UUID string
    uuidValue = value.trim();
    console.log('[ProjectType] Extracted UUID from string:', uuidValue);
  } else if (value && typeof value === 'object' && value.value) {
    // In case the full object is passed instead of just the value
    uuidValue = typeof value.value === 'string' ? value.value : '';
    console.log('[ProjectType] Extracted UUID from object.value:', uuidValue);
  } else {
    console.log('[ProjectType] No valid UUID found, using empty string');
  }
  
  console.log('[ProjectType] Calling handleFormUpdate with uuidValue:', uuidValue);
  // Always update the form, even if empty (for clearing selection)
  handleFormUpdate('project_type_uuid', uuidValue);
  console.log('[ProjectType] After handleFormUpdate, form.project_type_uuid should be:', uuidValue);
};

const handleProjectTypeChange = (projectType: any) => {
  console.log('[ProjectType] handleProjectTypeChange called with:', {
    projectType,
    projectTypeType: typeof projectType,
    hasValue: projectType && projectType.value,
    value: projectType?.value,
    currentFormValue: props.form.project_type_uuid
  });
  
  // @change event can pass either the UUID string directly OR the full object
  // Handle both cases
  let uuidValue: string = '';
  
  if (typeof projectType === 'string' && projectType.trim().length > 0) {
    // If it's already a string UUID, use it directly
    uuidValue = projectType.trim();
    console.log('[ProjectType] Change event received UUID string directly:', uuidValue);
  } else if (projectType && typeof projectType === 'object' && projectType.value) {
    // If it's an object with a value property, extract it
    uuidValue = typeof projectType.value === 'string' ? projectType.value.trim() : '';
    console.log('[ProjectType] Extracting UUID from change event object:', uuidValue);
  } else if (!projectType) {
    // Handle clearing the selection
    console.log('[ProjectType] Clearing project type selection');
    uuidValue = '';
  } else {
    console.log('[ProjectType] Change event received but no valid value found:', projectType);
    return; // Don't update if we can't extract a valid value
  }
  
  handleFormUpdate('project_type_uuid', uuidValue);
};

const handleServiceTypeValueUpdate = (value: string | undefined | any) => {
  console.log('[ServiceType] handleServiceTypeValueUpdate called with:', {
    value,
    valueType: typeof value,
    isString: typeof value === 'string',
    isObject: typeof value === 'object',
    hasValueProp: value && typeof value === 'object' && 'value' in value,
    currentFormValue: props.form.service_type_uuid
  });
  
  // @update:model-value should emit the UUID string, but handle edge cases
  let uuidValue: string = '';
  
  if (typeof value === 'string' && value.trim().length > 0) {
    // Valid UUID string
    uuidValue = value.trim();
    console.log('[ServiceType] Extracted UUID from string:', uuidValue);
  } else if (value && typeof value === 'object' && value.value) {
    // In case the full object is passed instead of just the value
    uuidValue = typeof value.value === 'string' ? value.value : '';
    console.log('[ServiceType] Extracted UUID from object.value:', uuidValue);
  } else {
    console.log('[ServiceType] No valid UUID found, using empty string');
  }
  
  console.log('[ServiceType] Calling handleFormUpdate with uuidValue:', uuidValue);
  // Always update the form, even if empty (for clearing selection)
  handleFormUpdate('service_type_uuid', uuidValue);
  console.log('[ServiceType] After handleFormUpdate, form.service_type_uuid should be:', uuidValue);
};

const handleServiceTypeChange = (serviceType: any) => {
  console.log('[ServiceType] handleServiceTypeChange called with:', {
    serviceType,
    serviceTypeType: typeof serviceType,
    hasValue: serviceType && serviceType.value,
    value: serviceType?.value,
    currentFormValue: props.form.service_type_uuid
  });
  
  // @change event can pass either the UUID string directly OR the full object
  // Handle both cases
  let uuidValue: string = '';
  
  if (typeof serviceType === 'string' && serviceType.trim().length > 0) {
    // If it's already a string UUID, use it directly
    uuidValue = serviceType.trim();
    console.log('[ServiceType] Change event received UUID string directly:', uuidValue);
  } else if (serviceType && typeof serviceType === 'object' && serviceType.value) {
    // If it's an object with a value property, extract it
    uuidValue = typeof serviceType.value === 'string' ? serviceType.value.trim() : '';
    console.log('[ServiceType] Extracting UUID from change event object:', uuidValue);
  } else if (!serviceType) {
    // Handle clearing the selection
    console.log('[ServiceType] Clearing service type selection');
    uuidValue = '';
  } else {
    console.log('[ServiceType] Change event received but no valid value found:', serviceType);
    return; // Don't update if we can't extract a valid value
  }
  
  handleFormUpdate('service_type_uuid', uuidValue);
};

// Project Layout checkbox handlers
const handleOnlyTotalChange = (value: boolean | string) => {
  const boolValue = typeof value === 'boolean' ? value : (typeof value === 'string' ? value === 'true' : Boolean(value));
  const updatedForm = { ...props.form, only_total: boolValue };
  
  // If "Only Total" is selected, disable Labor and Material
  if (boolValue) {
    updatedForm.enable_labor = false;
    updatedForm.enable_material = false;
  }
  
  emit('update:form', updatedForm);
};

const handleLaborChange = (value: boolean | string) => {
  const boolValue = typeof value === 'boolean' ? value : (typeof value === 'string' ? value === 'true' : Boolean(value));
  const updatedForm = { ...props.form, enable_labor: boolValue };
  
  // If Labor is selected, disable "Only Total"
  if (boolValue) {
    updatedForm.only_total = false;
  }
  
  emit('update:form', updatedForm);
};

const handleMaterialChange = (value: boolean | string) => {
  const boolValue = typeof value === 'boolean' ? value : (typeof value === 'string' ? value === 'true' : Boolean(value));
  const updatedForm = { ...props.form, enable_material: boolValue };
  
  // If Material is selected, disable "Only Total"
  if (boolValue) {
    updatedForm.only_total = false;
  }
  
  emit('update:form', updatedForm);
};

const previewFile = (attachment: any) => {
  console.log('Preview file clicked - Original attachment:', attachment);
  
  // Map the attachment to the format expected by FilePreview component
  selectedFileForPreview.value = {
    id: attachment.uuid || attachment.tempId,
    // Handle both database format (document_name) and temporary format (name)
    file_name: attachment.document_name || attachment.name,
    name: attachment.document_name || attachment.name,
    // Handle both database format (mime_type) and temporary format (type)
    file_type: attachment.mime_type || attachment.type,
    type: attachment.mime_type || attachment.type,
    // Handle both database format (file_size) and temporary format (size)
    file_size: attachment.file_size || attachment.size,
    size: attachment.file_size || attachment.size,
    // For database files, use file_url; for temporary files, use base64 data
    file_url: attachment.file_url || attachment.url || attachment.fileData,
    url: attachment.file_url || attachment.url || attachment.fileData
  };
  
  console.log('Preview file clicked - Mapped attachment:', selectedFileForPreview.value);
  showFilePreviewModal.value = true;
};

const closeFilePreview = () => {
  showFilePreviewModal.value = false;
  selectedFileForPreview.value = null;
};


const removeFile = async (index: number) => {
  const attachment = props.form.attachments[index];
  
  // If this is an existing file (has uuid), delete it from storage
  if (attachment.uuid && props.editingProject) {
    try {
      const response = await $fetch('/api/projects/remove-file', {
        method: 'POST',
        body: {
          documentUuid: attachment.uuid
        }
      });
      
      if ('success' in response && response.success && 'data' in response && response.data && 'fileName' in response.data) {
        console.log(`Successfully deleted file: ${response.data.fileName}`);
      } else if ('error' in response) {
        console.error('Failed to delete file from storage:', response.error);
        // Still remove from UI even if storage deletion fails
      }
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Still remove from UI even if storage deletion fails
    }
  }
  
  // Find and remove the corresponding file from uploadedFiles by matching name/size
  // This handles cases where arrays might be out of sync
  if (attachment.name || attachment.document_name) {
    const fileName = attachment.name || attachment.document_name;
    const fileSize = attachment.size || attachment.file_size;
    const fileIndex = uploadedFiles.value.findIndex(
      (file) => file.name === fileName && file.size === fileSize
    );
    if (fileIndex !== -1) {
      uploadedFiles.value.splice(fileIndex, 1);
    }
  } else {
    // Fallback: remove by index if we can't match by name/size
    if (index < uploadedFiles.value.length) {
      uploadedFiles.value.splice(index, 1);
    }
  }
  
  // Update form attachments
  const updatedAttachments = [...props.form.attachments];
  updatedAttachments.splice(index, 1);
  emit('update:form', { ...props.form, attachments: updatedAttachments });
  
  // Reset file input to allow re-selecting the same file
  // This forces the browser to recognize file selection even if it's the same file
  fileInputKey.value += 1;
};

const handleFileUpload = async () => {
  // Clear any previous errors
  fileUploadError.value = null;
  
  if (uploadedFiles.value.length === 0) {
    // Clear attachments if no files selected
    emit('update:form', { ...props.form, attachments: [] });
    return;
  }
  
  // Validate each file
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  for (const file of uploadedFiles.value) {
    if (!allowedTypes.includes(file.type)) {
      fileUploadError.value = 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.';
      return;
    }
    
    if (file.size > maxSize) {
      fileUploadError.value = 'File size too large. Maximum size is 10MB per file.';
      return;
    }
  }
  
  try {
    // Convert files to base64 for preview and temporary storage
    const attachments = await Promise.all(
      uploadedFiles.value.map(async (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const fileData = e.target?.result;
            if (typeof fileData !== 'string') {
              reject(new Error('Failed to read file'));
              return;
            }
            
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              url: fileData, // Store base64 data for preview
              fileData: fileData, // Store base64 data for upload
              file: file, // Store the file object for later upload
              isUploaded: false, // Flag to track upload status
              tempId: Date.now() + Math.random().toString(36).substring(2) // Temporary ID
            });
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      })
    );
    
    // Merge new attachments with existing ones (preserve existing files)
    const existingAttachments = props.form.attachments.filter((att: any) => att.isUploaded);
    const allAttachments = [...existingAttachments, ...attachments];
    
    // Update form with merged attachments
    emit('update:form', { ...props.form, attachments: allAttachments });
    fileUploadError.value = null;
  } catch (error) {
    console.error('Error processing files:', error);
    fileUploadError.value = 'Failed to process files. Please try again.';
  }
};

// Watch for uploaded files changes
watch(() => uploadedFiles.value, () => {
  handleFileUpload();
  emit('file-upload', uploadedFiles.value);
}, { deep: true });

// Watch for props.fileUploadError changes to sync with parent
watch(() => props.fileUploadError, (newError) => {
  if (newError) {
    fileUploadError.value = null; // Let parent error take precedence
  }
});

// Watch for area/rooms validation changes
watch(() => hasAreaOrRooms.value, (isValid) => {
  emit('validation-change', isValid);
}, { immediate: true });

// Note: Data fetching is now handled by the reusable components

// Note: loadExistingProjectDocuments function removed - now handled in parent component

// Note: Corporation change handling is now done by the reusable components

// Note: Existing project documents are now loaded in the parent component (ProjectDetails.vue)
// when editing a project, so we don't need to load them here

// Address management methods
const openAddressModal = () => {
  editingAddress.value = false;
  editingAddressUuid.value = null;
  editingAddressIndex.value = null;
  resetAddressForm();
  showAddressModal.value = true;
};

const editAddress = (address: any) => {
  editingAddress.value = true;

  // Check if it's a saved address (has uuid) or temporary address
  if (address.uuid) {
    editingAddressUuid.value = address.uuid;
    editingAddressIndex.value = null;
  } else {
    // It's a temporary address
    editingAddressUuid.value = null;
    editingAddressIndex.value = (props.form.tempAddresses || []).findIndex((a: any) => a.tempId === address.tempId);
  }

  addressForm.value = {
    address_type: address.address_type || null,
    contact_person: address.contact_person || '',
    email: address.email || '',
    phone: address.phone || '',
    address_line_1: address.address_line_1,
    address_line_2: address.address_line_2 || '',
    city: address.city || '',
    state: address.state || '',
    zip_code: address.zip_code || '',
    country: address.country || '',
    copied_from_billing_address_uuid: address.copied_from_billing_address_uuid || null
  };
  
  // Check the checkbox if this address was copied from a billing address
  // and the address type is shipment or final-destination
  sameAsBillingAddress.value = !!(
    address.copied_from_billing_address_uuid && 
    (address.address_type === 'shipment' || address.address_type === 'final-destination')
  );
  showAddressModal.value = true;
};

const closeAddressModal = () => {
  showAddressModal.value = false;
  editingAddress.value = false;
  editingAddressUuid.value = null;
  editingAddressIndex.value = null;
  resetAddressForm();
};

const resetAddressForm = () => {
  addressForm.value = {
    address_type: null as string | null,
    contact_person: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    copied_from_billing_address_uuid: null as string | null
  };
  sameAsBillingAddress.value = false;
};

// Auto-select address if it's the only one of its type
const ensureAddressSelection = (addresses: any[], newAddress: any): any => {
  if (!newAddress.address_type) return newAddress;
  
  const addressesOfSameType = addresses.filter(addr => 
    addr.address_type === newAddress.address_type && 
    (addr.uuid !== newAddress.uuid && addr.tempId !== newAddress.tempId)
  );
  
  // If this is the only address of this type, auto-select it
  if (addressesOfSameType.length === 0) {
    return { ...newAddress, is_primary: true };
  }
  
  return newAddress;
};

// Ensure at least one address per type is selected (only if that type has addresses)
const ensureAtLeastOnePerType = (addresses: any[]) => {
  const updatedAddresses = [...addresses];
  const addressTypes = ['shipment', 'bill', 'final-destination'];
  
  for (const addressType of addressTypes) {
    const addressesOfType = updatedAddresses.filter(addr => addr.address_type === addressType);
    
    // Only apply selection logic if this type has at least one address
    if (addressesOfType.length >= 1) {
      // Check if at least one is selected
      const hasSelected = addressesOfType.some(addr => addr.is_primary);
      
      if (!hasSelected) {
        // Auto-select the first one of this type
        const firstOfType = addressesOfType[0];
        const firstIndex = updatedAddresses.findIndex(addr => {
          if (firstOfType.uuid) {
            return addr.uuid === firstOfType.uuid;
          } else if (firstOfType.tempId) {
            return addr.tempId === firstOfType.tempId;
          }
          return false;
        });
        
        if (firstIndex !== -1) {
          updatedAddresses[firstIndex].is_primary = true;
        }
      }
    }
    // If addressesOfType.length < 1, we skip this type (no selection needed)
  }
  
  return updatedAddresses;
};

const saveAddress = async () => {
  if (!addressForm.value.address_line_1.trim()) {
    const toast = useToast();
    toast.add({
      title: 'Validation Error',
      description: 'Address Line 1 is required',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  isSavingAddress.value = true;
  try {
    if (props.form.id) {
      // Project is saved, use the API
      const allAddresses = projectAddresses.value;
      let addressToSave: any = { ...addressForm.value };
      
      // Auto-select if it's the only one of its type
      addressToSave = ensureAddressSelection(allAddresses, addressToSave);
      
      if (editingAddress.value && editingAddressUuid.value) {
        await projectAddressesStore.updateAddress({
          uuid: editingAddressUuid.value,
          ...addressToSave,
          is_primary: !!addressToSave.is_primary
        });
      } else {
        await projectAddressesStore.createAddress({
          project_uuid: props.form.id,
          ...addressToSave,
          is_primary: !!addressToSave.is_primary
        });
      }
      
      // After saving, ensure at least one per type is selected
      await projectAddressesStore.fetchAddresses(props.form.id);
      const savedAddresses = projectAddressesStore.getAddresses(props.form.id) || [];
      const addressesToUpdate = ensureAtLeastOnePerType(savedAddresses);
      
      // Update addresses that need to be marked as primary
      for (const addr of addressesToUpdate) {
        if (addr.is_primary && addr.uuid) {
          const currentSaved = savedAddresses.find((a: any) => a.uuid === addr.uuid);
          if (!currentSaved || !currentSaved.is_primary) {
            await projectAddressesStore.updateAddress({
              uuid: addr.uuid,
              is_primary: true
            });
          }
        }
      }
      
      await projectAddressesStore.fetchAddresses(props.form.id);
    } else {
      // Project is not saved yet, store as temporary address
      const allAddresses = projectAddresses.value;
      let tempAddress = {
        ...addressForm.value,
        tempId: Date.now() + Math.random().toString(36).substring(2),
        isTemp: true
      };
      
      // Auto-select if it's the only one of its type
      tempAddress = ensureAddressSelection(allAddresses, tempAddress);

      if (editingAddress.value && editingAddressIndex.value !== null) {
        // Update existing temporary address
        const tempAddresses = [...(props.form.tempAddresses || [])];
        tempAddresses[editingAddressIndex.value] = tempAddress;
        const updatedAddresses = ensureAtLeastOnePerType(tempAddresses);
        emit('update:form', { ...props.form, tempAddresses: updatedAddresses });
      } else {
        // Add new temporary address
        const tempAddresses = [...(props.form.tempAddresses || []), tempAddress];
        const updatedAddresses = ensureAtLeastOnePerType(tempAddresses);
        emit('update:form', { ...props.form, tempAddresses: updatedAddresses });
      }
    }
    
    closeAddressModal();
    
    const toast = useToast();
    toast.add({
      title: 'Success',
      description: editingAddress.value ? 'Address updated successfully' : 'Address added successfully',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    });
  } catch (error) {
    console.error('Error saving address:', error);
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: 'Failed to save address',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  } finally {
    isSavingAddress.value = false;
  }
};

const deleteAddress = async (address: any) => {
  try {
    if (address.uuid) {
      // It's a saved address, delete via API
      await projectAddressesStore.deleteAddress(address.uuid, address.project_uuid);
      
      // After deletion, ensure at least one per type is selected
      if (props.form.id) {
        await projectAddressesStore.fetchAddresses(props.form.id);
        const saved = projectAddressesStore.getAddresses(props.form.id) || [];
        const addressesToUpdate = ensureAtLeastOnePerType(saved);
        
        // Update addresses that need to be marked as primary
        for (const addr of addressesToUpdate) {
          if (addr.is_primary && addr.uuid) {
            const currentSaved = saved.find((a: any) => a.uuid === addr.uuid);
            if (!currentSaved || !currentSaved.is_primary) {
              await projectAddressesStore.updateAddress({
                uuid: addr.uuid,
                is_primary: true
              });
            }
          }
        }
        await projectAddressesStore.fetchAddresses(props.form.id);
      }
    } else {
      // It's a temporary address, remove from tempAddresses
      const tempAddresses = (props.form.tempAddresses || []).filter((a: any) => a.tempId !== address.tempId);
      // Ensure at least one per type is selected after deletion
      const updatedAddresses = ensureAtLeastOnePerType(tempAddresses);
      emit('update:form', { ...props.form, tempAddresses: updatedAddresses });
    }
    
    const toast = useToast();
    toast.add({
      title: 'Success',
      description: 'Address deleted successfully',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: 'Failed to delete address',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  }
};

// Method to save temporary addresses when project is created
const saveTemporaryAddresses = async (projectUuid: string) => {
  const tempAddresses = props.form.tempAddresses || [];
  if (tempAddresses.length === 0) return;

  try {
    // 1) Ensure at least one address per type is selected before saving
    const addressesToSave = ensureAtLeastOnePerType(tempAddresses);
    
    // 2) Persist all temporary addresses
    // First pass: save all addresses and create a mapping of tempId to uuid
    const tempIdToUuidMap = new Map<string, string>();
    
    for (const tempAddress of addressesToSave) {
      // Check if copied_from_billing_address_uuid is a tempId (exists in tempAddresses)
      const isTempIdReference = tempAddress.copied_from_billing_address_uuid && 
        addressesToSave.some(addr => addr.tempId === tempAddress.copied_from_billing_address_uuid);
      
      const savedAddress = await projectAddressesStore.createAddress({
        project_uuid: projectUuid,
        address_type: tempAddress.address_type,
        contact_person: tempAddress.contact_person,
        email: tempAddress.email,
        phone: tempAddress.phone,
        address_line_1: tempAddress.address_line_1,
        address_line_2: tempAddress.address_line_2,
        city: tempAddress.city,
        state: tempAddress.state,
        zip_code: tempAddress.zip_code,
        country: tempAddress.country,
        is_primary: !!tempAddress.is_primary,
        // Only include copied_from_billing_address_uuid if it's a UUID (not a tempId)
        // We'll handle tempId references in the second pass
        copied_from_billing_address_uuid: isTempIdReference ? null : (tempAddress.copied_from_billing_address_uuid || null)
      });
      
      // Map tempId to uuid for later reference
      if (tempAddress.tempId && savedAddress?.uuid) {
        tempIdToUuidMap.set(tempAddress.tempId, savedAddress.uuid);
      }
    }
    
    // Second pass: update addresses that reference tempIds with actual UUIDs
    for (const tempAddress of addressesToSave) {
      if (tempAddress.copied_from_billing_address_uuid && tempAddress.tempId) {
        // Check if this is a tempId reference
        const isTempIdReference = addressesToSave.some(
          addr => addr.tempId === tempAddress.copied_from_billing_address_uuid
        );
        
        if (isTempIdReference) {
          // This is a tempId reference, find the corresponding UUID
          const billingAddressUuid = tempIdToUuidMap.get(tempAddress.copied_from_billing_address_uuid);
          const currentAddressUuid = tempIdToUuidMap.get(tempAddress.tempId);
          
          if (billingAddressUuid && currentAddressUuid) {
            // Update the address with the correct billing address UUID
            await projectAddressesStore.updateAddress({
              uuid: currentAddressUuid,
              copied_from_billing_address_uuid: billingAddressUuid
            });
          }
        }
      }
    }

    // 3) Refresh addresses from server
    await projectAddressesStore.fetchAddresses(projectUuid);

    // 4) Ensure at least one per type is selected in saved addresses
    const saved = projectAddressesStore.getAddresses(projectUuid) as any[];
    const addressesToUpdate = ensureAtLeastOnePerType(saved);
    
    // Update addresses that need to be marked as primary
    for (const addr of addressesToUpdate) {
      if (addr.is_primary && addr.uuid) {
        const currentSaved = saved.find((a: any) => a.uuid === addr.uuid);
        if (!currentSaved || !currentSaved.is_primary) {
          await projectAddressesStore.updateAddress({
            uuid: addr.uuid,
            is_primary: true
          });
        }
      }
    }
    
    // Refresh again after updates
    await projectAddressesStore.fetchAddresses(projectUuid);
    const finalSaved = projectAddressesStore.getAddresses(projectUuid) as any[];
    
    // 5) Set the first primary address on project (for backward compatibility)
    const primaryAddresses = finalSaved.filter((a: any) => a.is_primary);
    if (primaryAddresses.length > 0 && primaryAddresses[0].uuid) {
      await projectsStore.updateProject({ 
        uuid: projectUuid, 
        project_address_uuid: primaryAddresses[0].uuid 
      } as any);
    }

    // 6) Clear temporary addresses in the form
    emit('update:form', { ...props.form, tempAddresses: [] });

    const toast = useToast();
    toast.add({
      title: 'Success',
      description: `${addressesToSave.length} address(es) saved successfully`,
      color: 'success',
      icon: 'i-heroicons-check-circle'
    });
  } catch (error) {
    console.error('Error saving temporary addresses:', error);
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: 'Failed to save addresses',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  }
};

// Watch for form.id changes to load addresses and save temporary ones
watch(() => props.form.id, (newId, oldId) => {
  if (newId && !oldId) {
    // Project was just created, save temporary addresses
    saveTemporaryAddresses(newId);
  } else if (newId) {
    // Project exists, load saved addresses
    projectAddressesStore.fetchAddresses(newId).then(() => {
      // After loading, ensure at least one per type is selected
      const saved = projectAddressesStore.getAddresses(newId) || [];
      if (saved.length > 0) {
        const addressesToUpdate = ensureAtLeastOnePerType(saved);
        // Update addresses that need to be marked as primary
        addressesToUpdate.forEach(async (addr) => {
          if (addr.is_primary && addr.uuid) {
            const currentSaved = saved.find((a: any) => a.uuid === addr.uuid);
            if (!currentSaved || !currentSaved.is_primary) {
              try {
                await projectAddressesStore.updateAddress({
                  uuid: addr.uuid,
                  is_primary: true
                });
              } catch (error) {
                console.error('Error updating address selection:', error);
              }
            }
          }
        });
      }
    });
  }
}, { immediate: true });

// Watch for address changes to auto-select when addresses are added/removed
// Ensures at least one per type is selected (only for types that have addresses)
watch(() => projectAddresses.value, (newAddresses) => {
  if (newAddresses.length > 0) {
    const updatedAddresses = ensureAtLeastOnePerType(newAddresses);
    
    // Check if any addresses need to be updated
    const needsUpdate = updatedAddresses.some((updatedAddr) => {
      const original = newAddresses.find(addr => 
        (updatedAddr.uuid && addr.uuid === updatedAddr.uuid) ||
        (updatedAddr.tempId && addr.tempId === updatedAddr.tempId)
      );
      return original && updatedAddr.is_primary !== original.is_primary;
    });
    
    if (needsUpdate) {
      // Update tempAddresses if project is not saved
      if (!props.form.id && props.form.tempAddresses) {
        const updatedTempAddresses = ensureAtLeastOnePerType(props.form.tempAddresses);
        emit('update:form', { ...props.form, tempAddresses: updatedTempAddresses });
      } else if (props.form.id) {
        // For saved projects, update via API
        updatedAddresses.forEach(async (addr) => {
          if (addr.is_primary && addr.uuid) {
            const currentSaved = newAddresses.find((a: any) => a.uuid === addr.uuid);
            if (!currentSaved || !currentSaved.is_primary) {
              try {
                await projectAddressesStore.updateAddress({
                  uuid: addr.uuid,
                  is_primary: true
                });
              } catch (error) {
                console.error('Error updating address selection:', error);
              }
            }
          }
        });
      }
    }
  }
}, { deep: true });

// Watch for corporation_uuid changes to generate project ID
watch(() => props.form.corporation_uuid, async (newCorpUuid) => {
  if (newCorpUuid && !props.editingProject) {
    // Ensure projects metadata is loaded for the corporation
    await projectsStore.fetchProjectsMetadata(newCorpUuid);
    // Only generate if creating new project and corporation is set
    generateProjectId();
  }
});

// Initialize project ID on mount if creating new project
onMounted(async () => {
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (corpUuid) {
    // Ensure projects metadata is loaded for the corporation
    await projectsStore.fetchProjectsMetadata(corpUuid);
  }
  // If creating new project and project_id is empty, generate initial ID
  if (!props.editingProject && (!props.form.project_id || String(props.form.project_id).trim() === '')) {
    generateProjectId();
  }
});

// Note: Data fetching on mount is now handled by the reusable components
</script>