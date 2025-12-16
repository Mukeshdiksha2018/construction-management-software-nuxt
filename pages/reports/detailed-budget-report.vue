<template>
  <div class="h-[88vh] print:h-auto">
    <!-- Header section - hidden in print -->
    <div class="mb-2 print:hidden">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <!-- Left side: Back button -->
        <div class="flex items-center gap-3">
          <UButton
            color="neutral"
            variant="solid"
            icon="i-heroicons-arrow-left"
            @click="goBack"
          />
        </div>

        <!-- Right side: Corporation, Project Selection, Date Range, Show and Print buttons -->
        <div class="flex items-end gap-3 flex-wrap">
          <!-- Corporation Select -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap">
              Corporation <span class="text-red-500">*</span>
            </label>
            <CorporationSelect
              v-model="selectedCorporationId"
              size="sm"
              class="w-64"
              @change="handleCorporationChangeFromSelect"
            />
          </div>

          <!-- Project Select -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap">
              Project <span class="text-red-500">*</span>
            </label>
            <ProjectSelect
              :model-value="selectedProjectId"
              :corporation-uuid="selectedCorporationId || undefined"
              placeholder="Select project"
              size="sm"
              class="w-64"
              @update:model-value="handleProjectChange"
            />
          </div>

          <!-- Start Date -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap">
              Start Date <span class="text-red-500">*</span>
            </label>
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton
                icon="i-heroicons-calendar"
                size="sm"
                variant="outline"
                class="w-48"
              >
                {{ startDateDisplayText }}
              </UButton>
              <template #content>
                <UCalendar
                  v-model="startDateValue"
                  :min-value="minDate"
                  :max-value="endDateValue || maxDate"
                  class="p-2"
                />
              </template>
            </UPopover>
          </div>

          <!-- End Date -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap">
              End Date <span class="text-red-500">*</span>
            </label>
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton
                icon="i-heroicons-calendar"
                size="sm"
                variant="outline"
                class="w-48"
              >
                {{ endDateDisplayText }}
              </UButton>
              <template #content>
                <UCalendar
                  v-model="endDateValue"
                  :min-value="startDateValue || minDate"
                  :max-value="maxDate"
                  class="p-2"
                />
              </template>
            </UPopover>
          </div>

          <!-- Show button -->
          <UButton
            :disabled="!canGenerateReport"
            icon="i-heroicons-magnifying-glass"
            variant="solid"
            size="sm"
            @click="handleShowReport"
          >
            Show
          </UButton>

          <!-- Print button -->
          <UButton
            v-if="reportData && selectedProjectId"
            icon="i-heroicons-printer"
            variant="soft"
            size="sm"
            @click="printReport"
          >
            Print
          </UButton>
        </div>
      </div>
    </div>

    <!-- Print Header - only visible in print -->
    <div class="hidden print:block print:mb-4 print:pb-4 print:border-b print:border-gray-300">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Detailed Budget Report</h1>
        <div v-if="reportData" class="text-sm text-gray-700">
          <p class="font-semibold">Project: {{ reportData.project.projectName }} ({{ reportData.project.projectId }})</p>
          <p v-if="startDateValue && endDateValue" class="text-xs text-gray-600 mt-1">
            Date Range: {{ startDateDisplayText }} to {{ endDateDisplayText }}
          </p>
          <p class="text-xs text-gray-600 mt-1">Generated on: {{ new Date().toLocaleDateString() }}</p>
        </div>
      </div>
    </div>

    <!-- Report Content Area -->
    <div class="p-4 print:p-2">
        <div v-if="!selectedCorporationId" class="text-center py-12">
          <UIcon name="i-heroicons-building-office" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p class="text-gray-500 text-lg">Please select a corporation to view the budget report</p>
        </div>
      <div v-else-if="!selectedProjectId" class="text-center py-12">
        <UIcon name="i-heroicons-folder" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select a project to view the detailed budget report</p>
      </div>
      <div v-else-if="!startDateValue || !endDateValue" class="text-center py-12">
        <UIcon name="i-heroicons-calendar" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select start date and end date to generate the report</p>
      </div>
      <div v-else-if="loading" class="space-y-3">
        <!-- Project Summary Skeleton -->
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <!-- Left Section: Project Name and Number -->
          <div class="bg-primary-50 dark:bg-primary-900 border-l-4 border-primary-500 rounded p-2">
            <div class="text-left">
              <USkeleton class="h-4 w-48 mb-1" />
              <USkeleton class="h-3 w-32" />
            </div>
          </div>
          
          <!-- Center Section: Title Skeleton -->
          <div class="flex-1 flex justify-center">
            <USkeleton class="h-6 w-48" />
          </div>
          
          <!-- Right Section: Stats -->
          <div class="bg-primary-50 dark:bg-primary-900 border-l-4 border-primary-500 rounded p-2 min-w-fit">
            <div class="flex gap-8">
              <div class="text-right">
                <USkeleton class="h-3 w-16 mb-1" />
                <USkeleton class="h-4 w-12" />
              </div>
              <div class="text-right">
                <USkeleton class="h-3 w-20 mb-1" />
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="text-right">
                <USkeleton class="h-3 w-16 mb-1" />
                <USkeleton class="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>

        <!-- Report Table Skeleton -->
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-xs">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                <th class="text-left py-1 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-20" />
                </th>
                <th class="text-left py-1 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-24" />
                </th>
                <th class="text-right py-1 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-28 ml-auto" />
                </th>
                <th class="text-right py-1 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-32 ml-auto" />
                </th>
                <th class="text-right py-1 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-32 ml-auto" />
                </th>
                <th class="text-right py-1 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-24 ml-auto" />
                </th>
                <th class="text-right py-1 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-24 ml-auto" />
                </th>
                <th class="text-right py-1 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </th>
                <th class="text-right py-1 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-28 ml-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="i in 2" :key="i">
                  <!-- Division Header -->
                  <tr class="bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                    <td class="py-1 px-2 font-bold text-xs text-default uppercase" colspan="9">
                      <USkeleton class="h-4 w-64" />
                    </td>
                  </tr>
                
                <!-- Cost Code Rows -->
                <template v-for="j in 3" :key="j">
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <td class="py-1 px-2 pl-4 text-default text-xs">
                      <USkeleton class="h-3 w-16" />
                    </td>
                    <td class="py-1 px-2 text-default text-xs">
                      <USkeleton class="h-3 w-40" />
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      <USkeleton class="h-3 w-20 ml-auto" />
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      <USkeleton class="h-3 w-20 ml-auto" />
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      <USkeleton class="h-3 w-20 ml-auto" />
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      <USkeleton class="h-3 w-20 ml-auto" />
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      <USkeleton class="h-3 w-16 ml-auto" />
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      <USkeleton class="h-3 w-20 ml-auto" />
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      <USkeleton class="h-3 w-20 ml-auto" />
                    </td>
                  </tr>
                </template>
                
                <!-- Division Total -->
                <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 font-semibold">
                  <td class="py-1 px-2 text-xs text-default" colspan="2">
                    <USkeleton class="h-3 w-40" />
                  </td>
                  <td class="py-1 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-1 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-1 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-1 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-1 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-16 ml-auto" />
                  </td>
                  <td class="py-1 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-1 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="error && error !== null && error !== ''" class="text-center py-12">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-16 h-16 mx-auto text-red-400 mb-4" />
        <p class="text-red-500 text-lg">{{ error }}</p>
      </div>
      <div v-else-if="reportData && reportData.divisions && reportData.divisions.length > 0" class="space-y-3" :key="`report-${selectedProjectId}`">
          <!-- Project Summary -->
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <!-- Left Section: Project Name and Number -->
            <div class="bg-primary-50 dark:bg-primary-900 border-l-4 border-primary-500 rounded p-2">
              <div class="text-left">
                <h3 class="text-sm font-semibold text-primary-900 dark:text-primary-100">
                  Project Name: {{ reportData.project.projectName }}
                </h3>
                <p class="text-xs text-primary-700 dark:text-primary-300">Project Number: {{ reportData.project.projectId }}</p>
              </div>
            </div>
            
            <!-- Center Section: Title -->
            <div class="flex-1 flex justify-center">
              <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Detailed Budget Report</h1>
            </div>
            
            <!-- Right Section: Stats -->
            <div class="bg-primary-50 dark:bg-primary-900 border-l-4 border-primary-500 rounded p-2 min-w-fit">
              <div class="flex gap-8">
                <div class="text-right">
                  <p class="text-xs text-primary-600 dark:text-primary-400">No of Rooms</p>
                  <p class="text-sm font-semibold text-primary-900 dark:text-primary-100">{{ reportData.project.numberOfRooms }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-primary-600 dark:text-primary-400">Total Estimate</p>
                  <p class="text-sm font-semibold text-primary-900 dark:text-primary-100">
                    {{ formatCurrency(reportData.summary.totalBudgeted) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-primary-600 dark:text-primary-400">Per Room</p>
                  <p class="text-sm font-semibold text-primary-900 dark:text-primary-100">{{ formatCurrency(reportData.summary.costPerRoom) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Report Table -->
          <div class="overflow-x-auto print:overflow-visible">
            <table class="w-full border-collapse text-xs print:text-xs">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                  <th class="text-left py-2 px-2 font-bold text-sm text-default">Cost Codes</th>
                  <th class="text-left py-2 px-2 font-bold text-sm text-default">Description</th>
                  <th class="text-right py-2 px-2 font-bold text-sm text-default">Budgeted Amount</th>
                  <th class="text-right py-2 px-2 font-bold text-sm text-default">Purchase Order Amount</th>
                  <th class="text-right py-2 px-2 font-bold text-sm text-default">Change Order Amount</th>
                  <th class="text-right py-2 px-2 font-bold text-sm text-default">Total Amount</th>
                  <th class="text-right py-2 px-2 font-bold text-sm text-default">Cost per Room</th>
                  <th class="text-right py-2 px-2 font-bold text-sm text-default">Paid amount</th>
                  <th class="text-right py-2 px-2 font-bold text-sm text-default">Budget Remaining</th>
                </tr>
              </thead>
              <tbody>
                <!-- Main divisions (excluding Other Costs) -->
                <template v-for="division in mainDivisions" :key="division.uuid">
                  <!-- Division Header (Label only, no totals) -->
                  <tr class="bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                    <td class="py-1 px-2 font-bold text-xs text-default uppercase" colspan="9">
                      {{ division.divisionNumber }} - {{ division.divisionName }}
                    </td>
                  </tr>
                  
                  <!-- Cost Codes (recursive component) -->
                  <template v-for="costCode in division.costCodes" :key="costCode.uuid">
                    <!-- Cost Code Row -->
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <td class="py-1 px-2 pl-4 text-default text-xs">{{ costCode.costCodeNumber }}</td>
                      <td class="py-1 px-2 text-default text-xs">{{ costCode.costCodeName }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.budgetedAmount) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.purchaseOrderAmount) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.changeOrderAmount) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.totalAmount) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.costPerRoom) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.paidAmount) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.budgetRemaining) }}</td>
                    </tr>
                    
                    <!-- Sub-Cost Codes (Level 2) -->
                    <template v-if="costCode.subCostCodes && costCode.subCostCodes.length > 0">
                      <template v-for="subCostCode in costCode.subCostCodes" :key="subCostCode.uuid">
                        <tr class="border-b border-gray-200 dark:border-gray-700">
                          <td class="py-1 px-2 pl-8 text-xs text-default">{{ subCostCode.costCodeNumber }}</td>
                          <td class="py-1 px-2 text-xs text-default">{{ subCostCode.costCodeName }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.budgetedAmount) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.purchaseOrderAmount) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.changeOrderAmount) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.totalAmount) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.costPerRoom) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.paidAmount) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.budgetRemaining) }}</td>
                        </tr>
                        
                        <!-- Sub-Sub-Cost Codes (Level 3) -->
                        <template v-if="subCostCode.subCostCodes && subCostCode.subCostCodes.length > 0">
                          <tr
                            v-for="subSubCostCode in subCostCode.subCostCodes"
                            :key="subSubCostCode.uuid"
                            class="border-b border-gray-200 dark:border-gray-700"
                          >
                            <td class="py-1 px-2 pl-12 text-xs text-muted">{{ subSubCostCode.costCodeNumber }}</td>
                            <td class="py-1 px-2 text-xs text-muted">{{ subSubCostCode.costCodeName }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.budgetedAmount) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.purchaseOrderAmount) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.changeOrderAmount) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.totalAmount) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.costPerRoom) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.paidAmount) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.budgetRemaining) }}</td>
                          </tr>
                        </template>
                      </template>
                    </template>
                  </template>
                  
                  <!-- Division Total -->
                  <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 font-semibold">
                    <td class="py-1 px-2 text-xs text-default" colspan="2">
                      TOTAL {{ division.divisionName.toUpperCase() }}
                    </td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalBudgeted) }}</td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalPurchaseOrder) }}</td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalChangeOrder) }}</td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalAmount) }}</td>
                    <td class="py-1 px-2 text-right text-xs text-default">
                      {{ formatCurrency(division.totalAmount / reportData.project.numberOfRooms) }}
                    </td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalPaid) }}</td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalRemaining) }}</td>
                  </tr>
      </template>

                <!-- Totals excluding Other Costs (shown between main and other sections) -->
                <tr
                  v-if="mainDivisions.length"
                  class="bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700"
                >
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50" colspan="2">
                    Total (excluding Other Costs):
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(mainTotals.totalBudgeted) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(mainTotals.totalPurchaseOrder) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(mainTotals.totalChangeOrder) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(mainTotals.totalAmount) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(reportData.project.numberOfRooms ? mainTotals.totalAmount / reportData.project.numberOfRooms : 0) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(mainTotals.totalPaid) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(mainTotals.totalRemaining) }}
                  </td>
                </tr>

                <!-- Other Costs heading -->
                <tr
                  v-if="hasOtherDivisions"
                  class="bg-primary-50 dark:bg-primary-900/40 border-t border-b border-primary-300 dark:border-primary-700"
                >
                  <td
                    class="py-2.5 px-2 text-sm font-semibold text-center text-primary-900 dark:text-primary-100 tracking-wide uppercase"
                    colspan="9"
                  >
                    Other Costs
                  </td>
                </tr>

                <!-- Other Costs divisions (shown after main ones) -->
                <template
                  v-for="division in otherDivisions"
                  :key="`${division.uuid}-other`"
                >
                  <!-- Division Header -->
                  <tr class="bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                    <td class="py-1 px-2 font-bold text-xs text-default uppercase" colspan="9">
                      {{ division.divisionNumber }} - {{ division.divisionName }}
                    </td>
                  </tr>

                  <!-- Cost Codes (recursive, same structure as main divisions) -->
                  <template v-for="costCode in division.costCodes" :key="costCode.uuid">
                    <!-- Cost Code Row -->
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <td class="py-1 px-2 pl-4 text-default text-xs">{{ costCode.costCodeNumber }}</td>
                      <td class="py-1 px-2 text-default text-xs">{{ costCode.costCodeName }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.budgetedAmount) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.purchaseOrderAmount) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.changeOrderAmount) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.totalAmount) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.costPerRoom) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.paidAmount) }}</td>
                      <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(costCode.budgetRemaining) }}</td>
                    </tr>

                    <!-- Sub-Cost Codes (Level 2) -->
                    <template v-if="costCode.subCostCodes && costCode.subCostCodes.length > 0">
                      <template v-for="subCostCode in costCode.subCostCodes" :key="subCostCode.uuid">
                        <tr class="border-b border-gray-200 dark:border-gray-700">
                          <td class="py-1 px-2 pl-8 text-xs text-default">{{ subCostCode.costCodeNumber }}</td>
                          <td class="py-1 px-2 text-xs text-default">{{ subCostCode.costCodeName }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.budgetedAmount) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.purchaseOrderAmount) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.changeOrderAmount) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.totalAmount) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.costPerRoom) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.paidAmount) }}</td>
                          <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(subCostCode.budgetRemaining) }}</td>
                        </tr>

                        <!-- Sub-Sub-Cost Codes (Level 3) -->
                        <template v-if="subCostCode.subCostCodes && subCostCode.subCostCodes.length > 0">
                          <tr
                            v-for="subSubCostCode in subCostCode.subCostCodes"
                            :key="subSubCostCode.uuid"
                            class="border-b border-gray-200 dark:border-gray-700"
                          >
                            <td class="py-1 px-2 pl-12 text-xs text-muted">{{ subSubCostCode.costCodeNumber }}</td>
                            <td class="py-1 px-2 text-xs text-muted">{{ subSubCostCode.costCodeName }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.budgetedAmount) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.purchaseOrderAmount) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.changeOrderAmount) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.totalAmount) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.costPerRoom) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.paidAmount) }}</td>
                            <td class="py-1 px-2 text-right text-xs text-muted">{{ formatCurrency(subSubCostCode.budgetRemaining) }}</td>
                          </tr>
                        </template>
                      </template>
                    </template>
                  </template>

                  <!-- Division Total for Other Costs division -->
                  <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 font-semibold">
                    <td class="py-1 px-2 text-xs text-default" colspan="2">
                      TOTAL {{ division.divisionName.toUpperCase() }}
                    </td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalBudgeted) }}</td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalPurchaseOrder) }}</td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalChangeOrder) }}</td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalAmount) }}</td>
                    <td class="py-1 px-2 text-right text-xs text-default">
                      {{ formatCurrency(division.totalAmount / reportData.project.numberOfRooms) }}
                    </td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalPaid) }}</td>
                    <td class="py-1 px-2 text-right text-xs text-default">{{ formatCurrency(division.totalRemaining) }}</td>
                  </tr>
                </template>
              </tbody>

              <!-- Highlighted totals footer, similar to EstimateLineItemsTable -->
              <tfoot v-if="reportData && (mainDivisions.length || otherDivisions.length)">
                <!-- Other Costs totals -->
                <tr
                  v-if="hasOtherDivisions"
                  class="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
                >
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50" colspan="2">
                    Total Other Costs:
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(otherTotals.totalBudgeted) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(otherTotals.totalPurchaseOrder) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(otherTotals.totalChangeOrder) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(otherTotals.totalAmount) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(reportData.project.numberOfRooms ? otherTotals.totalAmount / reportData.project.numberOfRooms : 0) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(otherTotals.totalPaid) }}
                  </td>
                  <td class="py-2 px-2 text-xs font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(otherTotals.totalRemaining) }}
                  </td>
                </tr>

                <!-- Grand totals (including Other Costs) -->
                <tr class="bg-gray-200 dark:bg-gray-900/70 border-t-2 border-gray-300 dark:border-gray-700">
                  <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50" colspan="2">
                    Grand Total (including Other Costs):
                  </td>
                  <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(grandTotals.totalBudgeted) }}
                  </td>
                  <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(grandTotals.totalPurchaseOrder) }}
                  </td>
                  <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(grandTotals.totalChangeOrder) }}
                  </td>
                  <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(grandTotals.totalAmount) }}
                  </td>
                  <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(reportData.project.numberOfRooms ? grandTotals.totalAmount / reportData.project.numberOfRooms : 0) }}
                  </td>
                  <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(grandTotals.totalPaid) }}
                  </td>
                  <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                    {{ formatCurrency(grandTotals.totalRemaining) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      <div v-else-if="!loading && (!reportData || !reportData.divisions || reportData.divisions.length === 0)" class="text-center py-12">
        <UIcon name="i-heroicons-document-chart-bar" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">No report data available</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, toRef, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'
import { useBudgetReport } from '@/composables/useBudgetReport'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useUTCDateFormat } from '@/composables/useUTCDateFormat'
import ProjectSelect from '@/components/Shared/ProjectSelect.vue'
import CorporationSelect from '@/components/Shared/CorporationSelect.vue'
import type { BudgetReportData } from '@/composables/useBudgetReport'

const router = useRouter()

// Navigation
const goBack = () => {
  router.back()
}

// Set page title
useHead({
  title: 'Detailed Budget Report - Property Management'
})

definePageMeta({
  layout: 'main-layout',
  middleware: 'auth',
})

// Stores
const corporationStore = useCorporationStore()
const projectsStore = useProjectsStore()

// State
const selectedCorporationId = ref<string | undefined>(undefined)
const selectedProjectId = ref<string | undefined>(undefined)

// Date range state
const { createDateRangeParams } = useUTCDateFormat()
const currentYear = new Date().getFullYear()
const todayDate = today(getLocalTimeZone())
const startDateValue = ref<CalendarDate | null>(new CalendarDate(currentYear, 1, 1))
const endDateValue = ref<CalendarDate | null>(todayDate)

// Date formatting
const df = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium'
})

const startDateDisplayText = computed(() => {
  if (!startDateValue.value) return 'Select start date'
  return df.format(startDateValue.value.toDate(getLocalTimeZone()))
})

const endDateDisplayText = computed(() => {
  if (!endDateValue.value) return 'Select end date'
  return df.format(endDateValue.value.toDate(getLocalTimeZone()))
})

const minDate = new CalendarDate(1900, 1, 1)
const maxDate = todayDate

// Check if report can be generated
const canGenerateReport = computed(() => {
  return !!(
    selectedCorporationId.value &&
    selectedProjectId.value &&
    startDateValue.value &&
    endDateValue.value &&
    startDateValue.value.compare(endDateValue.value) <= 0
  )
})


// Handlers
const handleCorporationChangeFromSelect = async (corporation: any) => {
  // Clear project selection when corporation changes
  selectedProjectId.value = undefined
  
  // Fetch projects for the selected corporation
  // ProjectSelect component will also fetch if needed, but we fetch here to ensure data is available
  const corporationId = corporation?.value ?? corporation?.uuid
  if (corporationId) {
    try {
      await projectsStore.fetchProjects(corporationId)
    } catch (error) {
      // Silently handle error
    }
  }
}

// Budget Report
const budgetReport = useBudgetReport()
const { formatCurrency } = useCurrencyFormat()
const reportData = ref<BudgetReportData | null>(null)

// Split divisions into main vs "Other Costs" based on division flag
const mainDivisions = computed(() => {
  const divisions = reportData.value?.divisions || []
  return divisions.filter(
    (d) => d.excludeInEstimatesAndReports !== true
  )
})

const otherDivisions = computed(() => {
  const divisions = reportData.value?.divisions || []
  return divisions.filter(
    (d) => d.excludeInEstimatesAndReports === true
  )
})

const hasOtherDivisions = computed(
  () => otherDivisions.value.length > 0
)

const buildDivisionTotals = (divisions: Array<BudgetReportData['divisions'][number]>) => {
  return {
    totalBudgeted: divisions.reduce((sum, d) => sum + (d.totalBudgeted || 0), 0),
    totalPurchaseOrder: divisions.reduce((sum, d) => sum + (d.totalPurchaseOrder || 0), 0),
    totalChangeOrder: divisions.reduce((sum, d) => sum + (d.totalChangeOrder || 0), 0),
    totalAmount: divisions.reduce((sum, d) => sum + (d.totalAmount || 0), 0),
    totalPaid: divisions.reduce((sum, d) => sum + (d.totalPaid || 0), 0),
    totalRemaining: divisions.reduce((sum, d) => sum + (d.totalRemaining || 0), 0),
  }
}

const mainTotals = computed(() =>
  buildDivisionTotals(mainDivisions.value)
)

const otherTotals = computed(() =>
  buildDivisionTotals(otherDivisions.value)
)

const grandTotals = computed(() => {
  // Prefer summary when available to avoid double-calculation,
  // otherwise fall back to combining main + other totals
  if (reportData.value?.summary) {
    return {
      totalBudgeted: reportData.value.summary.totalBudgeted || 0,
      totalPurchaseOrder: reportData.value.summary.totalPurchaseOrder || 0,
      totalChangeOrder: reportData.value.summary.totalChangeOrder || 0,
      totalAmount: reportData.value.summary.totalAmount || 0,
      totalPaid: reportData.value.summary.totalPaid || 0,
      totalRemaining: reportData.value.summary.totalRemaining || 0,
    }
  }

  return {
    totalBudgeted: mainTotals.value.totalBudgeted + otherTotals.value.totalBudgeted,
    totalPurchaseOrder: mainTotals.value.totalPurchaseOrder + otherTotals.value.totalPurchaseOrder,
    totalChangeOrder: mainTotals.value.totalChangeOrder + otherTotals.value.totalChangeOrder,
    totalAmount: mainTotals.value.totalAmount + otherTotals.value.totalAmount,
    totalPaid: mainTotals.value.totalPaid + otherTotals.value.totalPaid,
    totalRemaining: mainTotals.value.totalRemaining + otherTotals.value.totalRemaining,
  }
})

// Expose loading and error from composable - unwrap readonly refs
const loading = computed(() => budgetReport.loading.value)
const error = computed(() => budgetReport.error.value)

// Computed to check if report should be shown
const showReport = computed(() => {
  return !loading.value && !error.value && reportData.value && reportData.value.divisions && reportData.value.divisions.length > 0
})

const handleProjectChange = async (projectId: string | undefined) => {
  selectedProjectId.value = projectId
  // Clear report data when project changes - user needs to click Show button
  if (!projectId) {
    reportData.value = null
  }
}

const handleShowReport = async () => {
  if (!canGenerateReport.value) {
    return
  }
  await loadBudgetReport()
}

const loadBudgetReport = async () => {
  if (!selectedCorporationId.value || !selectedProjectId.value || !startDateValue.value || !endDateValue.value) {
    reportData.value = null
    return
  }
  
  // Convert dates to UTC strings
  const dateRange = createDateRangeParams(
    `${startDateValue.value.year}-${String(startDateValue.value.month).padStart(2, '0')}-${String(startDateValue.value.day).padStart(2, '0')}`,
    `${endDateValue.value.year}-${String(endDateValue.value.month).padStart(2, '0')}-${String(endDateValue.value.day).padStart(2, '0')}`
  )
  
  if (!dateRange) {
    reportData.value = null
    return
  }
  
  try {
    const data = await budgetReport.generateBudgetReport(
      selectedCorporationId.value,
      selectedProjectId.value,
      dateRange.start_date,
      dateRange.end_date
    )
    
    // Set reportData - use reactive assignment
    if (data && data.divisions && Array.isArray(data.divisions)) {
      // Create a new object to ensure reactivity
      reportData.value = {
        project: { ...data.project },
        divisions: data.divisions.map(div => ({ ...div })),
        summary: { ...data.summary }
      }
    } else {
      reportData.value = null
    }
    
    // Force reactivity update
    await nextTick()
  } catch (error) {
    reportData.value = null
  }
}

const printReport = () => {
  window.print()
}

// Watch for corporation changes - clear report data
watch(selectedCorporationId, () => {
  reportData.value = null
})

// Watch for project changes - clear report data
watch(selectedProjectId, () => {
  reportData.value = null
})

// Initialize with selected corporation from store if available
onMounted(async () => {
  try {
    // If there's a selected corporation in the store, use it
    if (corporationStore.selectedCorporationId) {
        selectedCorporationId.value = corporationStore.selectedCorporationId
      await handleCorporationChangeFromSelect({ value: corporationStore.selectedCorporationId })
    }
  } catch (error) {
    // Silently handle error
  }
})
</script>

<style>
/* Print optimizations - Hide layout and UI elements, show only report */
@media print {
  /* Reset page margins and background */
  @page {
    margin: 1cm;
    size: A4 portrait;
  }

  html, body {
    background: #ffffff !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Hide layout components (SideMenu, TopBar, MobileBottomNav) */
  nav,
  aside,
  header:not(.print-header),
  [class*="SideMenu"],
  [class*="TopBar"],
  [class*="MobileBottomNav"],
  [class*="side-menu"],
  [class*="top-bar"],
  [class*="mobile-bottom-nav"],
  /* Target layout structure */
  .flex.h-screen > aside,
  .flex.h-screen > div:first-child,
  .flex.h-screen > div:last-child {
    display: none !important;
  }

  /* Hide main layout wrapper elements but keep content */
  main {
    padding: 0 !important;
    margin: 0 !important;
    background: #ffffff !important;
    border-radius: 0 !important;
  }

  /* Hide the outer layout flex container's background */
  .flex.h-screen {
    background: #ffffff !important;
  }

  /* Hide non-essential UI elements in the report page */
  button,
  [class*="print:hidden"],
  .mb-2.print\\:hidden {
    display: none !important;
  }

  /* Show print-only elements */
  [class*="print:block"],
  .hidden.print\\:block {
    display: block !important;
  }

  /* Hide empty state messages */
  .text-center:has(UIcon),
  [class*="text-center"]:has(svg) {
    display: none !important;
  }

  /* Ensure all text is black for printing */
  * {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  /* Keep borders and backgrounds for tables */
  table {
    border-collapse: collapse !important;
    width: 100% !important;
    font-size: 9px !important;
    page-break-inside: auto;
  }

  th, td {
    border: 1px solid #000000 !important;
    padding: 3px 4px !important;
    background: #ffffff !important;
    color: #000000 !important;
  }

  /* Table header styling */
  thead th {
    background: #f0f0f0 !important;
    font-weight: bold !important;
    border: 1px solid #000000 !important;
    color: #000000 !important;
  }

  /* Division header rows */
  tbody tr[class*="bg-gray-50"] th,
  tbody tr[class*="bg-gray-50"] td {
    background: #e5e5e5 !important;
    font-weight: bold !important;
    color: #000000 !important;
  }

  /* Division total rows */
  tbody tr[class*="bg-gray-100"] th,
  tbody tr[class*="bg-gray-100"] td {
    background: #d0d0d0 !important;
    font-weight: bold !important;
    color: #000000 !important;
  }

  /* Grand total row */
  tfoot tr[class*="bg-gray-200"] th,
  tfoot tr[class*="bg-gray-200"] td,
  tbody tr[class*="bg-gray-200"] th,
  tbody tr[class*="bg-gray-200"] td {
    background: #b0b0b0 !important;
    font-weight: bold !important;
    color: #000000 !important;
  }

  /* Project summary boxes */
  [class*="bg-primary-50"] {
    background: #e5e5e5 !important;
    border: 1px solid #000000 !important;
    color: #000000 !important;
  }

  /* Prevent page breaks inside table rows */
  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Allow page breaks between divisions */
  tbody tr[class*="bg-gray-50"] {
    page-break-after: auto;
  }

  /* Optimize spacing for print */
  [class*="print:p-2"] {
    padding: 0.5rem !important;
  }

  [class*="print:mb-4"] {
    margin-bottom: 1rem !important;
  }

  [class*="print:pb-4"] {
    padding-bottom: 1rem !important;
  }

  [class*="print:border-b"] {
    border-bottom: 1px solid #000000 !important;
  }

  /* Ensure text is readable and black */
  .text-xs,
  .text-sm,
  .text-lg,
  .text-xl,
  .text-2xl,
  p,
  span,
  div,
  h1,
  h2,
  h3 {
    color: #000000 !important;
  }

  /* Hide scrollbars and overflow */
  [class*="overflow"] {
    overflow: visible !important;
  }

  /* Ensure full width */
  [class*="w-full"] {
    width: 100% !important;
  }

  /* Print header styling */
  [class*="print:text-2xl"] {
    font-size: 18px !important;
    color: #000000 !important;
  }

  [class*="print:text-sm"] {
    font-size: 11px !important;
    color: #000000 !important;
  }

  [class*="print:text-xs"] {
    font-size: 9px !important;
    color: #000000 !important;
  }

  /* Ensure all dark mode styles are overridden */
  [class*="dark:"] {
    color: #000000 !important;
    background: transparent !important;
  }

  /* Hide icons and SVG elements */
  svg,
  [class*="icon"],
  UIcon,
  [class*="UIcon"] {
    display: none !important;
  }

  /* Hide skeleton loaders */
  [class*="Skeleton"],
  [class*="skeleton"] {
    display: none !important;
  }

  /* Ensure proper spacing */
  .space-y-3 > * + * {
    margin-top: 0.75rem !important;
  }

  /* Hide loading states */
  [class*="loading"],
  [v-if*="loading"] {
    display: none !important;
  }
}
</style>

