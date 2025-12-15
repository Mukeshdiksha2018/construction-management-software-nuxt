<template>
  <div class="w-full">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Loading cost codes...</p>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else-if="!loading && visibleDivisions.length === 0" class="flex flex-col items-center justify-center py-12">
      <UIcon name="i-heroicons-list-bullet" class="w-12 h-12 text-gray-400 mb-4" />
      <p class="text-gray-500 text-lg font-medium">No cost codes found</p>
      <p class="text-gray-400 text-sm text-center">
        Cost codes will appear here once they are configured in your corporation settings.
      </p>
    </div>

    <!-- Table Content -->
    <div v-else>
      <!-- Table Header -->
      <div class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div class="flex gap-4 px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider">
          <div class="flex-1">Cost Codes</div>
          <div class="w-32">Estimation</div>
          <div v-if="showLabor" class="w-48">Labor</div>
          <div v-if="showMaterial" class="w-48">Material</div>
          <div v-if="showTotal" class="w-48 text-right">Total</div>
          <div class="w-20 text-center">{{ isReadOnly ? '' : 'Actions' }}</div>
        </div>
      </div>

      <!-- Table Body -->
      <div class="bg-white dark:bg-gray-800">
      <!-- Main divisions (included in primary totals) -->
      <div
        v-for="division in mainVisibleDivisions"
        :key="division.uuid"
        class="border-b border-gray-100 dark:border-gray-700"
      >
        <!-- Division Row -->
        <div class="flex gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-700">
          <div class="flex-1">
            <span class="font-bold text-gray-900 dark:text-gray-100">
              {{ division.division_number }} {{ division.division_name }}
            </span>
          </div>
          <div class="w-32"></div>
          <div v-if="showLabor" class="w-48 text-right font-bold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getDivisionLaborTotal(division)) }}
          </div>
          <div v-if="showMaterial" class="w-48 text-right font-bold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getDivisionMaterialTotal(division)) }}
          </div>
          <div v-if="showTotal" class="w-48 text-right font-bold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getDivisionTotal(division)) }}
          </div>
          <div class="w-20"></div>
        </div>

         <!-- Cost Codes under Division -->
         <div v-for="costCode in division.costCodes" :key="costCode.uuid">
           <!-- Cost Code with Sub-accounts - Show as Accordion -->
           <div v-if="costCode.subCostCodes && costCode.subCostCodes.length > 0">
             <CustomAccordion 
               :items="getCostCodeAccordionItems(costCode)" 
               class="w-full"
               type="single"
               :collapsible="true"
             >
               <template #trigger="{ item, isOpen }">
                 <div class="flex gap-4 w-full items-center px-4 py-2 group cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 border-l-4 border-transparent hover:border-primary-400 dark:hover:border-primary-500" 
                      :title="`Click to ${isOpen ? 'collapse' : 'expand'} sub-accounts`">
                   <div class="flex-1 flex items-center gap-2">
                     <span class="text-xs text-gray-700 dark:text-gray-300 font-medium group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-200">
                       {{ costCode.cost_code_number }} {{ costCode.cost_code_name }}
                     </span>
                     <UIcon 
                       name="i-heroicons-chevron-right" 
                       class="w-5 h-5 text-primary-600 dark:text-primary-400 transition-transform duration-200 flex-shrink-0"
                       :class="{ 'rotate-90': isOpen }"
                     />
                   </div>
                   <div class="w-32">
                     <!-- Empty space for alignment - no estimate button for calculated totals -->
                   </div>
                   <div v-if="showLabor" class="w-48">
                     <UInput
                       :model-value="formatCurrency(getCostCodeLaborTotal(costCode))"
                       type="text"
                       size="xs"
                       class="w-48"
                       :ui="{ base: 'text-right font-mono' }"
                       disabled
                     />
                   </div>
                   <div v-if="showMaterial" class="w-48">
                     <UInput
                       :model-value="formatCurrency(getCostCodeMaterialTotal(costCode))"
                       type="text"
                       size="xs"
                       class="w-48"
                       :ui="{ base: 'text-right font-mono' }"
                       disabled
                     />
                   </div>
                   <div v-if="showTotal" class="w-48">
                     <UInput
                       :model-value="formatCurrency(getCostCodeTotal(costCode))"
                       type="text"
                       size="xs"
                       class="w-48"
                       :ui="{ base: 'text-right font-mono' }"
                       disabled
                     />
                   </div>
                   <div class="w-20"></div>
                 </div>
               </template>
               <template #content="{ item }">
                 <div class="px-4 pb-3 bg-gradient-to-r from-primary-50/50 to-primary-100/50 dark:from-primary-900/10 dark:to-primary-800/10">
                   <!-- Sub Cost Codes -->
                   <div v-for="subCostCode in item.subCostCodes" :key="subCostCode.uuid" 
                        class="border-b border-gray-50 dark:border-gray-600 last:border-b-0 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors duration-200 rounded-md px-2 py-1">
                     <!-- Sub Cost Code Row -->
                     <div class="flex gap-4 py-2">
                       <div class="flex-1 pl-8">
                         <span class="text-xs text-gray-600 dark:text-gray-400">
                           {{ subCostCode.cost_code_number }} {{ subCostCode.cost_code_name }}
                         </span>
                       </div>
                       <!-- Show inputs only if no third level cost codes -->
                       <template v-if="!subCostCode.subSubCostCodes || subCostCode.subSubCostCodes.length === 0">
                        <div class="w-32">
                          <UButton
                            data-testid="estimate-button"
                            :label="isApplied(subCostCode.uuid) ? 'Applied' : 'Estimate'"
                            size="xs"
                            :color="isApplied(subCostCode.uuid) ? 'success' : 'neutral'"
                            :variant="isApplied(subCostCode.uuid) ? 'soft' : 'solid'"
                            @click="openEstimateModal(subCostCode)"
                          />
                        </div>
                         <div v-if="showLabor" class="w-48">
                            <UInput
                              :model-value="formatCurrency(parseFloat(subCostCode.labor_amount) || 0)"
                              type="text"
                              size="xs"
                              class="w-48"
                              :ui="{ base: 'text-right font-mono' }"
                              disabled
                            />
                         </div>
                         <div v-if="showMaterial" class="w-48">
                            <UInput
                              :model-value="formatCurrency(parseFloat(subCostCode.material_amount) || 0)"
                              type="text"
                              size="xs"
                              class="w-48"
                              :ui="{ base: 'text-right font-mono' }"
                              disabled
                            />
                         </div>
                         <div v-if="showTotal" class="w-48">
                            <UInput
                              :model-value="formatCurrency(parseFloat(subCostCode.total_amount) || 0)"
                              type="text"
                              size="xs"
                              class="w-48"
                              :ui="{ base: 'text-right font-mono' }"
                              disabled
                            />
                         </div>
                         <div class="w-20 flex items-center justify-center gap-1">
               <UButton
                 v-if="!isReadOnly"
                 data-testid="delete-cost-code"
                 icon="mingcute:delete-fill"
                 size="xs"
                 color="error"
                 variant="ghost"
                 @click="deleteSubCostCode(subCostCode)"
               />
                         </div>
                       </template>
                       <!-- No columns shown when third level cost codes exist -->
                       <template v-else>
                         <div class="w-32"></div>
                         <div v-if="showLabor" class="w-48"></div>
                         <div v-if="showMaterial" class="w-48"></div>
                         <div v-if="showTotal" class="w-48 text-right font-mono text-sm">
                           {{ formatCurrency(getSubCostCodeTotal(subCostCode)) }}
                         </div>
                         <div class="w-20"></div>
                       </template>
                     </div>

                     <!-- Sub-Sub Cost Codes (Third Level) - Always Visible -->
                     <div v-if="subCostCode.subSubCostCodes && subCostCode.subSubCostCodes.length > 0" 
                          class="mt-2 p-3 rounded-md border-2 transition-all duration-200 bg-gradient-to-br from-primary-50 to-primary-200 border-primary-300 shadow-sm dark:from-primary-900/20 dark:to-primary-800/20 dark:border-primary-400">
                       <div v-for="subSubCostCode in subCostCode.subSubCostCodes" :key="subSubCostCode.uuid" 
                            class="flex gap-4 py-1">
                         <div class="flex-1">
                           <span class="text-xs text-gray-700 dark:text-gray-300">
                             {{ subSubCostCode.cost_code_number }} {{ subSubCostCode.cost_code_name }}
                           </span>
                         </div>
                         <div class="w-32">
                           <UButton
                             data-testid="estimate-button"
                             :label="isApplied(subSubCostCode.uuid) ? 'Applied' : 'Estimate'"
                             size="xs"
                             :color="isApplied(subSubCostCode.uuid) ? 'success' : 'neutral'"
                             :variant="isApplied(subSubCostCode.uuid) ? 'soft' : 'solid'"
                             @click="openEstimateModal(subSubCostCode)"
                           />
                         </div>
                         <div v-if="showLabor" class="w-48">
                            <UInput
                              :model-value="formatCurrency(parseFloat(subSubCostCode.labor_amount) || 0)"
                              type="text"
                              size="xs"
                              class="w-48"
                              :ui="{ base: 'text-right font-mono' }"
                              disabled
                            />
                         </div>
                         <div v-if="showMaterial" class="w-48">
                            <UInput
                              :model-value="formatCurrency(parseFloat(subSubCostCode.material_amount) || 0)"
                              type="text"
                              size="xs"
                              class="w-48"
                              :ui="{ base: 'text-right font-mono' }"
                              disabled
                            />
                         </div>
                         <div v-if="showTotal" class="w-48">
                            <UInput
                              :model-value="formatCurrency(parseFloat(subSubCostCode.total_amount) || 0)"
                              type="text"
                              size="xs"
                              class="w-48"
                              :ui="{ base: 'text-right font-mono' }"
                              disabled
                            />
                         </div>
                         <div class="w-20 flex items-center justify-center gap-1">
                           <UButton
                             v-if="!isReadOnly"
                             data-testid="delete-cost-code"
                             icon="mingcute:delete-fill"
                             size="xs"
                             color="error"
                             variant="ghost"
                             @click="deleteSubSubCostCode(subSubCostCode)"
                           />
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </template>
             </CustomAccordion>
           </div>
           
           <!-- Cost Code without Sub-accounts - Show as Table Row -->
          <div v-else class="flex gap-4 px-4 py-2 border-b border-gray-50 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
             <div class="flex-1">
               <span class="text-xs text-gray-700 dark:text-gray-300 font-medium">
                 {{ costCode.cost_code_number }} {{ costCode.cost_code_name }}
               </span>
             </div>
            <div class="w-32">
              <UButton
                data-testid="estimate-button"
                :label="isApplied(costCode.uuid) ? 'Applied' : 'Estimate'"
                size="xs"
                :color="isApplied(costCode.uuid) ? 'success' : 'neutral'"
                :variant="isApplied(costCode.uuid) ? 'soft' : 'solid'"
                @click="openEstimateModal(costCode)"
              />
            </div>
            <div v-if="showLabor" class="w-48">
              <UInput
                :model-value="formatCurrency(parseFloat(costCode.labor_amount) || 0)"
                type="text"
                size="xs"
                class="w-48"
                :ui="{ base: 'text-right font-mono' }"
                disabled
              />
             </div>
            <div v-if="showMaterial" class="w-48">
              <UInput
                :model-value="formatCurrency(parseFloat(costCode.material_amount) || 0)"
                type="text"
                size="xs"
                class="w-48"
                :ui="{ base: 'text-right font-mono' }"
                disabled
              />
             </div>
            <div v-if="showTotal" class="w-48">
              <UInput
                :model-value="formatCurrency(parseFloat(costCode.total_amount) || 0)"
                type="text"
                size="xs"
                class="w-48"
                :ui="{ base: 'text-right font-mono' }"
                disabled
              />
             </div>
            <div class="w-20 flex items-center justify-center gap-1">
              <UButton
                v-if="!isReadOnly"
                data-testid="delete-cost-code"
                icon="mingcute:delete-fill"
                size="xs"
                color="error"
                variant="ghost"
                @click="deleteCostCode(costCode)"
              />
            </div>
           </div>
        </div>
      </div>

      <!-- Totals Footer for main divisions (exclude_in_estimates_and_reports !== true) -->
      <div
        v-if="(showTotal || showLabor || showMaterial) && visibleDivisions.length"
        class="bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 mt-2 rounded-t-lg"
      >
        <div class="flex gap-4 px-4 py-2">
          <div class="flex-1 text-right text-[11px] md:text-xs font-semibold text-gray-700 dark:text-gray-100 tracking-wide uppercase">
            Total
            <span class="ml-1 text-[10px] md:text-[11px] font-normal normal-case text-gray-500 dark:text-gray-400">
              (excluding Other Costs)
            </span>
          </div>
          <div v-if="showLabor" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getGrandLaborTotal()) }}
          </div>
          <div v-if="showMaterial" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getGrandMaterialTotal()) }}
          </div>
          <div v-if="showTotal" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getGrandTotal()) }}
          </div>
          <div class="w-20"></div>
        </div>
        <div class="flex gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <div class="flex-1 text-right text-[11px] md:text-xs font-medium text-gray-700 dark:text-gray-100 tracking-wide uppercase">
            Contingency
            <span class="ml-1 text-[10px] md:text-[11px] font-normal normal-case text-gray-500 dark:text-gray-400">
              (excluding Other Costs)
            </span>
          </div>
          <div v-if="showLabor" class="w-48 text-right text-sm md:text-base font-medium text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getGrandLaborContingencyTotal()) }}
          </div>
          <div v-if="showMaterial" class="w-48 text-right text-sm md:text-base font-medium text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getGrandMaterialContingencyTotal()) }}
          </div>
          <div v-if="showTotal" class="w-48 text-right text-sm md:text-base font-medium text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getGrandContingencyTotal()) }}
          </div>
          <div class="w-20"></div>
        </div>
        <div class="flex gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div class="flex-1 text-right text-[11px] md:text-xs font-semibold text-gray-900 dark:text-gray-50 tracking-wide uppercase">
            Grand Total
            <span class="ml-1 text-[10px] md:text-[11px] font-normal normal-case text-gray-500 dark:text-gray-300">
              (excluding Other Costs)
            </span>
          </div>
          <div v-if="showLabor" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getGrandLaborTotal() + getGrandLaborContingencyTotal()) }}
          </div>
          <div v-if="showMaterial" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getGrandMaterialTotal() + getGrandMaterialContingencyTotal()) }}
          </div>
          <div v-if="showTotal" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getGrandTotal() + getGrandContingencyTotal()) }}
          </div>
          <div class="w-20"></div>
        </div>
      </div>

      <!-- Other Costs divisions (exclude_in_estimates_and_reports === true) -->
      <div
        v-for="division in otherVisibleDivisions"
        :key="`${division.uuid}-other`"
        class="border-b border-gray-100 dark:border-gray-700"
      >
        <!-- Division Row (no totals shown for Other Costs header) -->
        <div class="flex gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-700">
          <div class="flex-1">
            <span class="font-bold text-gray-900 dark:text-gray-100">
              {{ division.division_number }} {{ division.division_name }}
            </span>
          </div>
          <div class="w-32"></div>
          <!-- Intentionally leave totals blank for Other Costs heading -->
          <div v-if="showLabor" class="w-48 text-right font-bold text-gray-900 dark:text-gray-100"></div>
          <div v-if="showMaterial" class="w-48 text-right font-bold text-gray-900 dark:text-gray-100"></div>
          <div v-if="showTotal" class="w-48 text-right font-bold text-gray-900 dark:text-gray-100"></div>
          <div class="w-20"></div>
        </div>

        <!-- Cost Codes under Division -->
        <div v-for="costCode in division.costCodes" :key="costCode.uuid">
          <!-- (reuse the same cost code / sub cost code markup as above) -->
          <!-- Cost Code with Sub-accounts - Show as Accordion -->
          <div v-if="costCode.subCostCodes && costCode.subCostCodes.length > 0">
            <CustomAccordion 
              :items="getCostCodeAccordionItems(costCode)" 
              class="w-full"
              type="single"
              :collapsible="true"
            >
              <template #trigger="{ item, isOpen }">
                <div class="flex gap-4 w-full items-center px-4 py-2 group cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 border-l-4 border-transparent hover:border-primary-400 dark:hover:border-primary-500" 
                     :title="`Click to ${isOpen ? 'collapse' : 'expand'} sub-accounts`">
                  <div class="flex-1 flex items-center gap-2">
                    <span class="text-xs text-gray-700 dark:text-gray-300 font-medium group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-200">
                      {{ costCode.cost_code_number }} {{ costCode.cost_code_name }}
                    </span>
                    <UIcon 
                      name="i-heroicons-chevron-right" 
                      class="w-5 h-5 text-primary-600 dark:text-primary-400 transition-transform duration-200 flex-shrink-0"
                      :class="{ 'rotate-90': isOpen }"
                    />
                  </div>
                  <div class="w-32"></div>
                  <div v-if="showLabor" class="w-48">
                    <UInput
                      :model-value="formatCurrency(getCostCodeLaborTotal(costCode))"
                      type="text"
                      size="xs"
                      class="w-48"
                      :ui="{ base: 'text-right font-mono' }"
                      disabled
                    />
                  </div>
                  <div v-if="showMaterial" class="w-48">
                    <UInput
                      :model-value="formatCurrency(getCostCodeMaterialTotal(costCode))"
                      type="text"
                      size="xs"
                      class="w-48"
                      :ui="{ base: 'text-right font-mono' }"
                      disabled
                    />
                  </div>
                  <div v-if="showTotal" class="w-48">
                    <UInput
                      :model-value="formatCurrency(getCostCodeTotal(costCode))"
                      type="text"
                      size="xs"
                      class="w-48"
                      :ui="{ base: 'text-right font-mono' }"
                      disabled
                    />
                  </div>
                  <div class="w-20"></div>
                </div>
              </template>
              <template #content="{ item }">
                <div class="px-4 pb-3 bg-gradient-to-r from-primary-50/50 to-primary-100/50 dark:from-primary-900/10 dark:to-primary-800/10">
                  <!-- Sub Cost Codes -->
                  <div
                    v-for="subCostCode in item.subCostCodes"
                    :key="subCostCode.uuid"
                    class="border-b border-gray-50 dark:border-gray-600 last:border-b-0 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors duration-200 rounded-md px-2 py-1"
                  >
                    <!-- Sub Cost Code Row -->
                    <div class="flex gap-4 py-2">
                      <div class="flex-1 pl-8">
                        <span class="text-xs text-gray-600 dark:text-gray-400">
                          {{ subCostCode.cost_code_number }} {{ subCostCode.cost_code_name }}
                        </span>
                      </div>
                      <!-- Show inputs only if no third level cost codes -->
                      <template v-if="!subCostCode.subSubCostCodes || subCostCode.subSubCostCodes.length === 0">
                        <div class="w-32">
                          <UButton
                            data-testid="estimate-button"
                            :label="isApplied(subCostCode.uuid) ? 'Applied' : 'Estimate'"
                            size="xs"
                            :color="isApplied(subCostCode.uuid) ? 'success' : 'neutral'"
                            :variant="isApplied(subCostCode.uuid) ? 'soft' : 'solid'"
                            @click="openEstimateModal(subCostCode)"
                          />
                        </div>
                        <div v-if="showLabor" class="w-48">
                          <UInput
                            :model-value="formatCurrency(parseFloat(subCostCode.labor_amount) || 0)"
                            type="text"
                            size="xs"
                            class="w-48"
                            :ui="{ base: 'text-right font-mono' }"
                            disabled
                          />
                        </div>
                        <div v-if="showMaterial" class="w-48">
                          <UInput
                            :model-value="formatCurrency(parseFloat(subCostCode.material_amount) || 0)"
                            type="text"
                            size="xs"
                            class="w-48"
                            :ui="{ base: 'text-right font-mono' }"
                            disabled
                          />
                        </div>
                        <div v-if="showTotal" class="w-48">
                          <UInput
                            :model-value="formatCurrency(parseFloat(subCostCode.total_amount) || 0)"
                            type="text"
                            size="xs"
                            class="w-48"
                            :ui="{ base: 'text-right font-mono' }"
                            disabled
                          />
                        </div>
                        <div class="w-20 flex items-center justify-center gap-1">
                          <UButton
                            v-if="!isReadOnly"
                            data-testid="delete-cost-code"
                            icon="mingcute:delete-fill"
                            size="xs"
                            color="error"
                            variant="ghost"
                            @click="deleteSubCostCode(subCostCode)"
                          />
                        </div>
                      </template>
                      <!-- No columns shown when third level cost codes exist -->
                      <template v-else>
                        <div class="w-32"></div>
                        <div v-if="showLabor" class="w-48"></div>
                        <div v-if="showMaterial" class="w-48"></div>
                        <div v-if="showTotal" class="w-48 text-right font-mono text-sm">
                          {{ formatCurrency(getSubCostCodeTotal(subCostCode)) }}
                        </div>
                        <div class="w-20"></div>
                      </template>
                    </div>

                    <!-- Sub-Sub Cost Codes (Third Level) - Always Visible -->
                    <div
                      v-if="subCostCode.subSubCostCodes && subCostCode.subSubCostCodes.length > 0"
                      class="mt-2 p-3 rounded-md border-2 transition-all duration-200 bg-gradient-to-br from-primary-50 to-primary-200 border-primary-300 shadow-sm dark:from-primary-900/20 dark:to-primary-800/20 dark:border-primary-400"
                    >
                      <div
                        v-for="subSubCostCode in subCostCode.subSubCostCodes"
                        :key="subSubCostCode.uuid"
                        class="flex gap-4 py-1"
                      >
                        <div class="flex-1">
                          <span class="text-xs text-gray-700 dark:text-gray-300">
                            {{ subSubCostCode.cost_code_number }} {{ subSubCostCode.cost_code_name }}
                          </span>
                        </div>
                        <div class="w-32">
                          <UButton
                            data-testid="estimate-button"
                            :label="isApplied(subSubCostCode.uuid) ? 'Applied' : 'Estimate'"
                            size="xs"
                            :color="isApplied(subSubCostCode.uuid) ? 'success' : 'neutral'"
                            :variant="isApplied(subSubCostCode.uuid) ? 'soft' : 'solid'"
                            @click="openEstimateModal(subSubCostCode)"
                          />
                        </div>
                        <div v-if="showLabor" class="w-48">
                          <UInput
                            :model-value="formatCurrency(parseFloat(subSubCostCode.labor_amount) || 0)"
                            type="text"
                            size="xs"
                            class="w-48"
                            :ui="{ base: 'text-right font-mono' }"
                            disabled
                          />
                        </div>
                        <div v-if="showMaterial" class="w-48">
                          <UInput
                            :model-value="formatCurrency(parseFloat(subSubCostCode.material_amount) || 0)"
                            type="text"
                            size="xs"
                            class="w-48"
                            :ui="{ base: 'text-right font-mono' }"
                            disabled
                          />
                        </div>
                        <div v-if="showTotal" class="w-48">
                          <UInput
                            :model-value="formatCurrency(parseFloat(subSubCostCode.total_amount) || 0)"
                            type="text"
                            size="xs"
                            class="w-48"
                            :ui="{ base: 'text-right font-mono' }"
                            disabled
                          />
                        </div>
                        <div class="w-20 flex items-center justify-center gap-1">
                          <UButton
                            v-if="!isReadOnly"
                            data-testid="delete-cost-code"
                            icon="mingcute:delete-fill"
                            size="xs"
                            color="error"
                            variant="ghost"
                            @click="deleteSubSubCostCode(subSubCostCode)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </CustomAccordion>
          </div>

          <!-- Cost Code without Sub-accounts - Show as Table Row -->
          <div v-else class="flex gap-4 px-4 py-2 border-b border-gray-50 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
            <div class="flex-1">
              <span class="text-xs text-gray-700 dark:text-gray-300 font-medium">
                {{ costCode.cost_code_number }} {{ costCode.cost_code_name }}
              </span>
            </div>
            <div class="w-32">
              <UButton
                data-testid="estimate-button"
                :label="isApplied(costCode.uuid) ? 'Applied' : 'Estimate'"
                size="xs"
                :color="isApplied(costCode.uuid) ? 'success' : 'neutral'"
                :variant="isApplied(costCode.uuid) ? 'soft' : 'solid'"
                @click="openEstimateModal(costCode)"
              />
            </div>
            <div v-if="showLabor" class="w-48">
              <UInput
                :model-value="formatCurrency(parseFloat(costCode.labor_amount) || 0)"
                type="text"
                size="xs"
                class="w-48"
                :ui="{ base: 'text-right font-mono' }"
                disabled
              />
            </div>
            <div v-if="showMaterial" class="w-48">
              <UInput
                :model-value="formatCurrency(parseFloat(costCode.material_amount) || 0)"
                type="text"
                size="xs"
                class="w-48"
                :ui="{ base: 'text-right font-mono' }"
                disabled
              />
            </div>
            <div v-if="showTotal" class="w-48">
              <UInput
                :model-value="formatCurrency(parseFloat(costCode.total_amount) || 0)"
                type="text"
                size="xs"
                class="w-48"
                :ui="{ base: 'text-right font-mono' }"
                disabled
              />
            </div>
            <div class="w-20 flex items-center justify-center gap-1">
              <UButton
                v-if="!isReadOnly"
                data-testid="delete-cost-code"
                icon="mingcute:delete-fill"
                size="xs"
                color="error"
                variant="ghost"
                @click="deleteCostCode(costCode)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- Separate Totals for "Other Costs" divisions (exclude_in_estimates_and_reports = true) -->
      <div
        v-if="(showTotal || showLabor || showMaterial) && otherDivisionsForTotals.length"
        class="bg-gray-50 dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 mt-3 rounded-lg"
      >
        <div class="flex gap-4 px-4 py-2">
          <div class="flex-1 text-right text-[11px] md:text-xs font-semibold text-gray-800 dark:text-gray-50 tracking-wide uppercase">
            Total Other Costs
          </div>
          <div v-if="showLabor" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getOtherGrandLaborTotal()) }}
          </div>
          <div v-if="showMaterial" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getOtherGrandMaterialTotal()) }}
          </div>
          <div v-if="showTotal" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getOtherGrandTotal()) }}
          </div>
          <div class="w-20"></div>
        </div>
        <div class="flex gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <div class="flex-1 text-right text-[11px] md:text-xs font-medium text-gray-800 dark:text-gray-50 tracking-wide uppercase">
            Other Costs Contingency
          </div>
          <div v-if="showLabor" class="w-48 text-right text-sm md:text-base font-medium text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getOtherGrandLaborContingencyTotal()) }}
          </div>
          <div v-if="showMaterial" class="w-48 text-right text-sm md:text-base font-medium text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getOtherGrandMaterialContingencyTotal()) }}
          </div>
          <div v-if="showTotal" class="w-48 text-right text-sm md:text-base font-medium text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getOtherGrandContingencyTotal()) }}
          </div>
          <div class="w-20"></div>
        </div>
        <div class="flex gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div class="flex-1 text-right text-[11px] md:text-xs font-semibold text-gray-900 dark:text-gray-50 tracking-wide uppercase">
            Other Costs Grand Total
          </div>
          <div v-if="showLabor" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getOtherGrandLaborTotal() + getOtherGrandLaborContingencyTotal()) }}
          </div>
          <div v-if="showMaterial" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getOtherGrandMaterialTotal() + getOtherGrandMaterialContingencyTotal()) }}
          </div>
          <div v-if="showTotal" class="w-48 text-right text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
            {{ formatCurrency(getOtherGrandTotal() + getOtherGrandContingencyTotal()) }}
          </div>
          <div class="w-20"></div>
        </div>
      </div>
    </div>

    <!-- Estimate Modal -->
    <UModal v-model:open="isEstimateModalOpen" :fullscreen="isItemWiseMaterial">
      <template #header>
        <div v-if="selectedCostCode" class="flex flex-col gap-1">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Estimate: {{ selectedCostCode.cost_code_number }} {{ selectedCostCode.cost_code_name }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Configure labor, material, and contingency estimates for this cost code
          </p>
        </div>
        <h3 v-else class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Estimate
        </h3>
      </template>
      <template #body>
        <div v-if="selectedCostCode">
          <UTabs :items="estimateTabs" :model-value="activeTab" @update:model-value="(value) => activeTab = String(value)" class="w-full">
            <template #labor>
              <div class="py-6 space-y-6">
                <!-- Estimate Type Radio Group -->
                <div>
                  <URadioGroup 
                    v-model="laborEstimateType" 
                    :items="laborEstimateTypeOptions"
                    legend="Estimate Type"
                    orientation="horizontal"
                    size="md"
                    :disabled="isReadOnly"
                  />
                </div>

                <!-- Manual Estimation -->
                <div v-if="laborEstimateType === 'manual'" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Amount
                    </label>
                    <UInput
                      v-model="laborManualAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      :disabled="isReadOnly"
                      @update:model-value="updateLaborTotal"
                    />
                  </div>
                </div>

                <!-- Per Room Estimation -->
                <div v-if="laborEstimateType === 'per-room'" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Rooms
                    </label>
                    <UInput
                      :model-value="currentProject?.no_of_rooms || 0"
                      disabled
                      placeholder="Number of rooms"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      This value is set in the project settings
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount Per Room
                    </label>
                    <UInput
                      v-model="laborAmountPerRoom"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      :disabled="isReadOnly"
                      @update:model-value="updateLaborTotal"
                    />
                  </div>
                </div>

                <!-- Per Sqft Estimation -->
                <div v-if="laborEstimateType === 'per-sqft'" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Project Area (sq ft)
                    </label>
                    <UInput
                      :model-value="currentProject?.area_sq_ft || 0"
                      disabled
                      placeholder="Area in sq ft"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      This value is set in the project settings
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount Per Sq Ft
                    </label>
                    <UInput
                      v-model="laborAmountPerSqft"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      :disabled="isReadOnly"
                      @update:model-value="updateLaborTotal"
                    />
                  </div>
                </div>

                <!-- Total Amount (Common) -->
                <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div class="flex justify-between items-center">
                    <label class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Total Labor Amount
                    </label>
                    <span class="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {{ formatCurrency(laborTotalAmount) }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
            
            <template #material>
              <div class="py-6 space-y-6">
                <!-- Estimate Type Radio Group -->
                <div>
                  <URadioGroup 
                    v-model="materialEstimateType" 
                    :items="materialEstimateTypeOptions"
                    legend="Estimate Type"
                    orientation="horizontal"
                    size="md"
                    :disabled="isReadOnly"
                  />
                </div>

                <!-- Manual Estimation -->
                <div v-if="materialEstimateType === 'manual'" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Amount
                    </label>
                    <UInput
                      v-model="materialManualAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      :disabled="isReadOnly"
                      @update:model-value="updateMaterialTotal"
                    />
                  </div>
                </div>

                <!-- Item Wise Estimation -->
                <div v-if="materialEstimateType === 'item-wise'" class="space-y-4">
                  <div class="flex items-center justify-between">
                    <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Items List</h4>
                    <UButton
                      icon="i-heroicons-plus"
                      size="sm"
                      color="primary"
                      :disabled="isReadOnly"
                      @click="addMaterialItem"
                    >
                      Add Item
                    </UButton>
                  </div>

                  <!-- Material Items Table -->
                  <div class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead class="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Type</th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sequence</th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Name</th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Model Number</th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit Price</th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">UOM</th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        <tr v-for="(item, index) in materialItems" :key="index" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <!-- Item Type -->
                          <td class="px-3 py-2">
                            <ItemTypeSelect
                              v-model="item.item_type"
                              :corporation-uuid="props.editingEstimate ? corpStore.selectedCorporation?.uuid : estimateCreationStore.selectedCorporationUuid"
                              :project-uuid="props.projectUuid"
                              placeholder="Select type"
                              size="xs"
                              class="w-32"
                              :ui="{ content: 'min-w-fit' }"
                              :disabled="isReadOnly"
                              @update:model-value="updateMaterialItemTotal(index)"
                            />
                          </td>
                          <!-- Sequence -->
                          <td class="px-3 py-2">
                            <SequenceSelect
                              v-model="item.item_uuid"
                              :corporation-uuid="props.editingEstimate ? corpStore.selectedCorporation?.uuid : estimateCreationStore.selectedCorporationUuid"
                              :cost-code-uuid="selectedCostCode?.uuid"
                              :use-estimate-creation-store="!props.editingEstimate"
                              :items="getMaterialItemOptionsForSequence(item)"
                              size="xs"
                              class="w-24"
                              :disabled="isReadOnly || item.is_preferred === true"
                              @change="(payload) => handleItemUuidChange(index, payload?.value, payload?.option)"
                            />
                          </td>
                          <!-- Item Name -->
                          <td class="px-3 py-2">
                            <ItemSelect
                              v-model="item.item_uuid"
                              :corporation-uuid="props.editingEstimate ? corpStore.selectedCorporation?.uuid : estimateCreationStore.selectedCorporationUuid"
                              :cost-code-uuid="selectedCostCode?.uuid"
                              :use-estimate-creation-store="!props.editingEstimate"
                              :items="getMaterialItemOptionsForItem(item)"
                              size="xs"
                              class="w-32"
                              placeholder="Select item"
                              :disabled="isReadOnly || item.is_preferred === true"
                              @change="(payload) => handleItemUuidChange(index, payload?.value, payload?.option)"
                            />
                          </td>
                          <!-- Description -->
                          <td class="px-3 py-2">
                            <UInput
                              v-model="item.description"
                              placeholder="Description"
                              size="xs"
                              class="w-32"
                              :disabled="isReadOnly"
                            />
                          </td>
                          <!-- Model Number -->
                          <td class="px-3 py-2">
                            <UInput
                              v-model="item.model_number"
                              placeholder="Model #"
                              size="xs"
                              class="w-24"
                              :disabled="isReadOnly"
                            />
                          </td>
                          <!-- Unit Price -->
                          <td class="px-3 py-2">
                            <UInput
                              v-model="item.unit_price"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              size="xs"
                              class="w-20"
                              :disabled="isReadOnly"
                              @update:model-value="updateMaterialItemTotal(index)"
                            />
                          </td>
                          <!-- UOM -->
                          <td class="px-3 py-2">
                          <UOMSelect
                              v-model="item.unit_uuid"
                              :corporation-uuid="corpStore.selectedCorporation?.uuid"
                              placeholder="UOM"
                              size="xs"
                              class="w-24"
                              :disabled="isReadOnly"
                              @change="(opt) => handleMaterialItemUnitChange(index, opt)"
                            />
                          </td>
                          <!-- Quantity -->
                          <td class="px-3 py-2">
                            <UInput
                              v-model="item.quantity"
                              type="number"
                              step="0.01"
                              placeholder="0"
                              size="xs"
                              class="w-16"
                              :disabled="isReadOnly"
                              @update:model-value="updateMaterialItemTotal(index)"
                            />
                          </td>
                          <!-- Total -->
                          <td class="px-3 py-2">
                            <div class="text-sm font-mono text-gray-900 dark:text-gray-100">
                              {{ formatCurrency(item.total) }}
                            </div>
                          </td>
                          <!-- Action -->
                          <td class="px-3 py-2">
                            <div class="flex space-x-1">
                              <UButton
                                icon="i-heroicons-plus"
                                size="xs"
                                color="neutral"
                                variant="ghost"
                                :disabled="isReadOnly"
                                @click="duplicateMaterialItem(index)"
                              />
                              <UButton
                                icon="i-heroicons-x-mark"
                                size="xs"
                                color="error"
                                variant="ghost"
                                :disabled="isReadOnly"
                                @click="removeMaterialItem(index)"
                              />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Total Amount -->
                  <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div class="flex justify-between items-center">
                      <label class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Total Material Amount
                      </label>
                      <span class="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {{ formatCurrency(materialTotalAmount) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            
            <template #contingency>
              <div class="py-6 space-y-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contingency Mode</label>
                  <URadioGroup 
                    :model-value="selectedCostCode?.contingency_enabled ? 'enabled' : 'disabled'"
                    :items="[
                      { label: 'Disable (use project contingency)', value: 'disabled' },
                      { label: 'Enable (custom for this cost code)', value: 'enabled' }
                    ]"
                    legend=""
                    orientation="horizontal"
                    size="md"
                    :disabled="isReadOnly"
                    @update:model-value="(val: string) => {
                      if (!selectedCostCode || isReadOnly) return
                      selectedCostCode.contingency_enabled = (val === 'enabled')
                      if (!selectedCostCode.contingency_enabled) {
                        selectedCostCode.contingency_percentage = null
                      } else {
                        // When enabling, seed with project contingency if no custom value exists
                        if (selectedCostCode.contingency_percentage === null || selectedCostCode.contingency_percentage === undefined || selectedCostCode.contingency_percentage === '') {
                          selectedCostCode.contingency_percentage = getProjectContingencyPercent()
                        }
                      }
                      triggerHierarchyRefresh()
                    }"
                  />
                </div>

                <div class="space-y-2">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {{ selectedCostCode?.contingency_enabled ? 'Custom Contingency (%)' : 'Project Contingency (%)' }}
                  </label>
                  <UInput
                    :model-value="selectedCostCode?.contingency_enabled 
                      ? (selectedCostCode?.contingency_percentage === null || selectedCostCode?.contingency_percentage === undefined
                          ? ''
                          : String(selectedCostCode.contingency_percentage))
                      : String(currentProject?.contingency_percentage ?? '0')"
                    type="number"
                    step="0.01"
                    :placeholder="selectedCostCode?.contingency_enabled ? String(currentProject?.contingency_percentage ?? '0') : 'e.g. 5'"
                    class="w-40"
                    :disabled="isReadOnly || !selectedCostCode?.contingency_enabled"
                    @update:model-value="(v: string | number) => {
                      if (!selectedCostCode || !selectedCostCode.contingency_enabled || isReadOnly) return
                      const str = String(v).trim()
                      // Allow empty string - user can clear the field
                      if (str === '' || str === null || str === undefined) {
                        selectedCostCode.contingency_percentage = null
                      } else {
                        const n = parseFloat(str)
                        selectedCostCode.contingency_percentage = Number.isFinite(n) ? Math.max(0, n) : null
                      }
                      triggerHierarchyRefresh()
                    }"
                  />
                  <p class="text-xs text-muted">
                    {{ selectedCostCode?.contingency_enabled 
                      ? 'Applied on the total estimate for this cost code.' 
                      : 'Using project-level contingency setting.' }}
                  </p>
                </div>

                <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-1">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-muted">Base Total</span>
                    <span class="text-sm font-mono">{{ formatCurrency(getSelectedCostCodeBaseTotal()) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-muted">Contingency (%)</span>
                    <span class="text-sm font-mono">{{ String(getSelectedCostCodeContingencyPercent()) }}%</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold">Total with Contingency</span>
                    <span class="text-sm font-mono font-semibold">{{ formatCurrency(getSelectedCostCodeTotalWithContingency()) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </UTabs>
        </div>
        <div v-else class="text-center py-8">
          <UIcon name="i-heroicons-wrench-screwdriver" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 class="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">Coming Soon</h4>
          <p class="text-gray-600 dark:text-gray-400">
            The estimation functionality is currently under development and will be available soon.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3 items-center">
          <UButton
            color="neutral"
            variant="solid"
            @click="closeEstimateModal"
          >
            Close
          </UButton>
          <UButton
            v-if="!isReadOnly && (laborTotalAmount > 0 || materialTotalAmount > 0)"
            color="primary"
            variant="solid"
            @click="applyEstimate"
          >
            Apply
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Removed Items Modal -->
    <UModal v-model:open="isRemovedItemsModalOpen">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-primary" />
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Removed Cost Codes</h3>
        </div>
      </template>
      <template #body>
        <div class="max-h-[60vh] overflow-auto">
          <div v-if="removedItemsList.length === 0" class="text-center py-8 text-gray-500">
            No removed items to restore
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="item in removedItemsList"
              :key="item.uuid"
              class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div class="flex-1">
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  {{ item.cost_code_number }} {{ item.cost_code_name }}
                </div>
                <div v-if="item.division_name" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Division: {{ item.division_name }}
                </div>
                <div v-if="item.parent_cost_code_name" class="text-sm text-gray-500 dark:text-gray-400">
                  Parent: {{ item.parent_cost_code_name }}
                </div>
              </div>
              <UButton
                icon="i-heroicons-plus"
                size="xs"
                color="primary"
                @click="restoreCostCode(item)"
              >
                Restore
              </UButton>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="isRemovedItemsModalOpen = false">Close</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useCorporationStore } from '@/stores/corporations'
import { useCostCodeDivisionsStore } from '@/stores/costCodeDivisions'
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations'
import { useEstimateCreationStore } from '@/stores/estimateCreation'
import { useProjectsStore } from '@/stores/projects'
import { useUOMStore } from '@/stores/uom'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import CustomAccordion from '@/components/Shared/CustomAccordion.vue'
import ItemTypeSelect from '@/components/Shared/ItemTypeSelect.vue'
import SequenceSelect from '@/components/Shared/SequenceSelect.vue'
import ItemSelect from '@/components/Shared/ItemSelect.vue'
import UOMSelect from '@/components/Shared/UOMSelect.vue'

// Props
interface Props {
  modelValue?: any[]
  projectUuid?: string
  deletedUuids?: string[]
  readonly?: boolean
  editingEstimate?: boolean // Whether we're editing an existing estimate
}

const props = defineProps<Props>()

const isReadOnly = computed(() => props.readonly === true)

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: any[]]
  'update:deletedUuids': [value: string[]]
}>()

// Stores
const corpStore = useCorporationStore()
const divisionsStore = useCostCodeDivisionsStore()
const configurationsStore = useCostCodeConfigurationsStore()
const estimateCreationStore = useEstimateCreationStore()
const projectsStore = useProjectsStore()
const uomStore = useUOMStore()
const { formatCurrency, currencySymbol } = useCurrencyFormat()

// State
const divisions = ref<any[]>([])
const configurations = ref<any[]>([])
const hierarchicalDataRef = ref<any[]>([]) // Store a mutable copy of hierarchical data
const loading = ref(false)

// Helper function to recursively filter out deleted cost codes
const filterDeletedCostCodes = (node: any): any | null => {
  // If this node is deleted, return null
  if (deletedUuidsLocal.value.has(node.uuid)) {
    return null
  }
  
  // Create a copy of the node
  const filtered = { ...node }
  
  // Filter sub-cost codes if they exist - always set as array (even if empty)
  if (Array.isArray(node.subCostCodes)) {
    filtered.subCostCodes = node.subCostCodes
      .map((sub: any) => filterDeletedCostCodes(sub))
      .filter((sub: any) => sub !== null)
  } else {
    // Ensure subCostCodes is always an array
    filtered.subCostCodes = []
  }
  
  // Filter sub-sub-cost codes if they exist - always set as array (even if empty)
  if (Array.isArray(node.subSubCostCodes)) {
    filtered.subSubCostCodes = node.subSubCostCodes
      .map((subSub: any) => filterDeletedCostCodes(subSub))
      .filter((subSub: any) => subSub !== null)
  } else {
    // Ensure subSubCostCodes is always an array
    filtered.subSubCostCodes = []
  }
  
  return filtered
}

// Computed property to filter out divisions with no cost codes and deleted cost codes
const visibleDivisions = computed(() => {
  return hierarchicalDataRef.value
    .map((division: any) => {
      // Filter out deleted cost codes from each division
      if (!division.costCodes || !Array.isArray(division.costCodes)) {
        return null
      }
      
      const filteredCostCodes = division.costCodes
        .map((costCode: any) => filterDeletedCostCodes(costCode))
        .filter((costCode: any) => costCode !== null)
      
      // Return division only if it has cost codes after filtering
      if (filteredCostCodes.length === 0) {
        return null
      }
      
      return {
        ...division,
        costCodes: filteredCostCodes
      }
    })
    .filter((division: any) => division !== null)
})

// Split visible divisions into main (included in primary totals) and "Other Costs"
const mainVisibleDivisions = computed(() =>
  visibleDivisions.value.filter(
    (division: any) => division?.exclude_in_estimates_and_reports !== true
  ),
)

const otherVisibleDivisions = computed(() =>
  visibleDivisions.value.filter(
    (division: any) => division?.exclude_in_estimates_and_reports === true
  ),
)
const isEstimateModalOpen = ref(false)
const selectedCostCode = ref<any>(null)
const hasPopulatedSavedData = ref(false)
const activeTab = ref('labor')

// Labor estimation state
const laborEstimateType = ref('manual')
const laborManualAmount = ref<number | string>('')
const laborAmountPerRoom = ref<number | string>('')
const laborAmountPerSqft = ref<number | string>('')

// Material estimation state
const materialEstimateType = ref('manual')
const materialManualAmount = ref<number | string>('')
const materialItems = ref<any[]>([])
const isItemWiseMaterial = computed(() => activeTab.value === 'material' && materialEstimateType.value === 'item-wise')
const laborTotalAmount = computed(() => {
  if (laborEstimateType.value === 'manual') {
    return parseFloat(String(laborManualAmount.value)) || 0
  } else if (laborEstimateType.value === 'per-room') {
    const numRooms = currentProject.value?.no_of_rooms || 0
    const amountPerRoom = parseFloat(String(laborAmountPerRoom.value)) || 0
    return numRooms * amountPerRoom
  } else if (laborEstimateType.value === 'per-sqft') {
    const area = currentProject.value?.area_sq_ft || 0
    const amountPerSqft = parseFloat(String(laborAmountPerSqft.value)) || 0
    return area * amountPerSqft
  }
  return 0
})

// Track applied cost codes
const appliedCostCodes = ref<Set<string>>(new Set())
const deletedUuidsLocal = ref<Set<string>>(new Set(props.deletedUuids || []))

// Removed items modal state
const isRemovedItemsModalOpen = ref(false)

// Get list of removed items with details
const removedItemsList = computed(() => {
  if (deletedUuidsLocal.value.size === 0) return []
  
  const removedItems: any[] = []
  
  // Search through hierarchicalData to find removed items
  hierarchicalData.value.forEach((division: any) => {
    division.costCodes?.forEach((cc: any) => {
      if (deletedUuidsLocal.value.has(cc.uuid)) {
        removedItems.push({
          uuid: cc.uuid,
          cost_code_number: cc.cost_code_number,
          cost_code_name: cc.cost_code_name,
          division_name: division.division_name,
          level: 'costCode',
          node: cc,
          divisionUuid: division.uuid
        })
      }
      
      // Check sub-cost codes
      cc.subCostCodes?.forEach((sc: any) => {
        if (deletedUuidsLocal.value.has(sc.uuid)) {
          removedItems.push({
            uuid: sc.uuid,
            cost_code_number: sc.cost_code_number,
            cost_code_name: sc.cost_code_name,
            division_name: division.division_name,
            parent_cost_code_name: `${cc.cost_code_number} ${cc.cost_code_name}`,
            level: 'subCostCode',
            node: sc,
            divisionUuid: division.uuid,
            costCodeUuid: cc.uuid
          })
        }
        
        // Check sub-sub-cost codes
        sc.subSubCostCodes?.forEach((ssc: any) => {
          if (deletedUuidsLocal.value.has(ssc.uuid)) {
            removedItems.push({
              uuid: ssc.uuid,
              cost_code_number: ssc.cost_code_number,
              cost_code_name: ssc.cost_code_name,
              division_name: division.division_name,
              parent_cost_code_name: `${sc.cost_code_number} ${sc.cost_code_name}`,
              level: 'subSubCostCode',
              node: ssc,
              divisionUuid: division.uuid,
              costCodeUuid: cc.uuid,
              subCostCodeUuid: sc.uuid
            })
          }
        })
      })
    })
  })
  
  return removedItems.sort((a, b) => {
    // Sort by division name, then cost code number
    if (a.division_name !== b.division_name) {
      return a.division_name.localeCompare(b.division_name)
    }
    return a.cost_code_number.localeCompare(b.cost_code_number)
  })
})

// Open removed items modal
const openRemovedItemsModal = () => {
  isRemovedItemsModalOpen.value = true
}

// Restore a removed cost code
const restoreCostCode = (item: any) => {
  if (!item || !item.uuid) return
  
  // Remove from deleted set
  deletedUuidsLocal.value.delete(item.uuid)
  emitDeletedUuids()
  
  // Find the division in hierarchicalDataRef
  const divisionRef = hierarchicalDataRef.value.find((d: any) => d.uuid === item.divisionUuid)
  if (!divisionRef) return
  
  // Restore based on level
  if (item.level === 'costCode') {
    // Check if cost code already exists
    if (!divisionRef.costCodes.find((c: any) => c.uuid === item.uuid)) {
      divisionRef.costCodes.push(structuredClone(item.node))
    }
  } else if (item.level === 'subCostCode') {
    // Find or create parent cost code
    let parentCC = divisionRef.costCodes.find((c: any) => c.uuid === item.costCodeUuid)
    if (!parentCC) {
      // Find parent from source
      const parentSource = hierarchicalData.value
        .find((d: any) => d.uuid === item.divisionUuid)
        ?.costCodes?.find((c: any) => c.uuid === item.costCodeUuid)
      if (parentSource) {
        parentCC = structuredClone(parentSource)
        // Remove sub-cost codes that are still deleted
        if (parentCC.subCostCodes) {
          parentCC.subCostCodes = parentCC.subCostCodes.filter((sc: any) => 
            !deletedUuidsLocal.value.has(sc.uuid)
          )
        }
        divisionRef.costCodes.push(parentCC)
      }
    }
    if (parentCC) {
      if (!parentCC.subCostCodes) parentCC.subCostCodes = []
      if (!parentCC.subCostCodes.find((sc: any) => sc.uuid === item.uuid)) {
        parentCC.subCostCodes.push(structuredClone(item.node))
      }
    }
  } else if (item.level === 'subSubCostCode') {
    // Find or create parent cost code
    let parentCC = divisionRef.costCodes.find((c: any) => c.uuid === item.costCodeUuid)
    if (!parentCC) {
      const parentSource = hierarchicalData.value
        .find((d: any) => d.uuid === item.divisionUuid)
        ?.costCodes?.find((c: any) => c.uuid === item.costCodeUuid)
      if (parentSource) {
        parentCC = structuredClone(parentSource)
        // Clean up deleted items
        if (parentCC.subCostCodes) {
          parentCC.subCostCodes = parentCC.subCostCodes.map((sc: any) => {
            if (sc.subSubCostCodes) {
              sc.subSubCostCodes = sc.subSubCostCodes.filter((ssc: any) => 
                !deletedUuidsLocal.value.has(ssc.uuid)
              )
            }
            return sc
          }).filter((sc: any) => !deletedUuidsLocal.value.has(sc.uuid))
        }
        divisionRef.costCodes.push(parentCC)
      }
    }
    if (parentCC) {
      // Find or create parent sub-cost code
      let parentSC = parentCC.subCostCodes?.find((sc: any) => sc.uuid === item.subCostCodeUuid)
      if (!parentSC) {
        const parentSCSource = hierarchicalData.value
          .find((d: any) => d.uuid === item.divisionUuid)
          ?.costCodes?.find((c: any) => c.uuid === item.costCodeUuid)
          ?.subCostCodes?.find((sc: any) => sc.uuid === item.subCostCodeUuid)
        if (parentSCSource) {
          parentSC = structuredClone(parentSCSource)
          if (parentSC.subSubCostCodes) {
            parentSC.subSubCostCodes = parentSC.subSubCostCodes.filter((ssc: any) => 
              !deletedUuidsLocal.value.has(ssc.uuid)
            )
          }
          if (!parentCC.subCostCodes) parentCC.subCostCodes = []
          parentCC.subCostCodes.push(parentSC)
        }
      }
      if (parentSC) {
        if (!parentSC.subSubCostCodes) parentSC.subSubCostCodes = []
        if (!parentSC.subSubCostCodes.find((ssc: any) => ssc.uuid === item.uuid)) {
          parentSC.subSubCostCodes.push(structuredClone(item.node))
        }
      }
    }
  }
  
  // Trigger reactivity update
  triggerHierarchyRefresh()
  
  // Emit line items update
  emitLineItemsUpdate()
}

const emitDeletedUuids = () => {
  emit('update:deletedUuids', Array.from(deletedUuidsLocal.value))
}

// Remove a cost code (at any level) from the hierarchical data by UUID
const removeCostCodeByUuid = (uuid: string) => {
  if (!uuid) return
  // mutate in place to ensure reactivity in tests and runtime
  const divisions = hierarchicalDataRef.value
  for (const division of divisions) {
    const removeFromArray = (arr: any[]) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const node = arr[i]
        if (node?.uuid === uuid) {
          arr.splice(i, 1)
          continue
        }
        if (Array.isArray(node?.subCostCodes)) {
          removeFromArray(node.subCostCodes)
        }
        if (Array.isArray(node?.subSubCostCodes)) {
          for (let j = node.subSubCostCodes.length - 1; j >= 0; j--) {
            if (node.subSubCostCodes[j]?.uuid === uuid) {
              node.subSubCostCodes.splice(j, 1)
            }
          }
        }
      }
    }
    if (Array.isArray(division.costCodes)) {
      removeFromArray(division.costCodes)
    }
  }
  // trigger computed updates
  nextTick(() => {
    hierarchicalDataRef.value = [...divisions]
    emitLineItemsUpdate()
  })
}

// Force refresh of hierarchy to reflect inline changes
const triggerHierarchyRefresh = () => {
  nextTick(() => {
    hierarchicalDataRef.value = [...hierarchicalDataRef.value]
  })
}

// Check if cost code has been applied
const isApplied = (costCodeUuid: string) => {
  // First check if it's in our applied set
  if (appliedCostCodes.value.has(costCodeUuid)) {
    return true
  }
  
  // Also check if the cost code has any values (for existing estimates)
  const costCode = findCostCodeByUuid(costCodeUuid)
  if (costCode) {
    const hasLabor = parseFloat(costCode.labor_amount) > 0
    const hasMaterial = parseFloat(costCode.material_amount) > 0
    const hasTotal = parseFloat(costCode.total_amount) > 0
    return hasLabor || hasMaterial || hasTotal
  }
  
  return false
}

// Helper function to find cost code by UUID
const findCostCodeByUuid = (uuid: string) => {
  for (const division of hierarchicalDataRef.value) {
    // Skip divisions with no cost codes (this function searches the full hierarchicalDataRef, not visibleDivisions)
    if (!division.costCodes || !Array.isArray(division.costCodes) || division.costCodes.length === 0) {
      continue
    }
    
    for (const costCode of division.costCodes) {
      if (costCode.uuid === uuid) {
        return costCode
      }
      
      // Check sub-cost codes
      if (costCode.subCostCodes) {
        for (const subCostCode of costCode.subCostCodes) {
          if (subCostCode.uuid === uuid) {
            return subCostCode
          }
          
          // Check sub-sub-cost codes
          if (subCostCode.subSubCostCodes) {
            for (const subSubCostCode of subCostCode.subSubCostCodes) {
              if (subSubCostCode.uuid === uuid) {
                return subSubCostCode
              }
            }
          }
        }
      }
    }
  }
  return null
}

// Labor estimate type options
const laborEstimateTypeOptions = computed(() => {
  const items: Array<{ label: string, value: string }> = [
    { label: 'Manual', value: 'manual' }
  ]
  if ((currentProject.value?.no_of_rooms || 0) > 0) {
    items.push({ label: 'Per Room', value: 'per-room' })
  }
  if ((currentProject.value?.area_sq_ft || 0) > 0) {
    items.push({ label: 'Per Sqft', value: 'per-sqft' })
  }
  return items
})

// Material estimate type options
const materialEstimateTypeOptions = [
  { label: 'Manual', value: 'manual' },
  { label: 'Item Wise', value: 'item-wise' }
]

// Material item options

const unitOptions = computed(() => {
  // Use estimateCreationStore for new estimates, global store for editing
  const active = props.editingEstimate
    ? (uomStore.getActiveUOM(corpStore.selectedCorporationId || 'global') || [])
    : (estimateCreationStore.getActiveUOM || []) // getActiveUOM is a computed property (auto-unwrapped)
  return active.map((u) => ({
    label: u.short_name || u.uom_name,
    value: u.uuid,
    shortName: u.short_name || u.uom_name,
    record: u,
  }))
})

const unitLookupByUuid = computed(() => new Map(unitOptions.value.map((opt) => [opt.value, opt])))
const unitLookupByShortName = computed(() => {
  const entries = unitOptions.value.map((opt) => [String(opt.shortName || '').toUpperCase(), opt] as const)
  return new Map(entries)
})

const defaultUnitOption = computed(() => unitOptions.value[0] || { value: '', label: '', shortName: '', record: null })

const resolveUnitOption = (value?: string | null, label?: string | null) => {
  if (value) {
    const opt = unitLookupByUuid.value.get(value)
    if (opt) {
      return opt
    }
  }
  if (label) {
    const opt = unitLookupByShortName.value.get(String(label).toUpperCase())
    if (opt) {
      return opt
    }
  }
  return defaultUnitOption.value
}

const normalizeMaterialItem = (raw: any) => {
  const item = { ...raw }
  const opt =
    resolveUnitOption(item.unit_uuid || item.unitUuid, item.unit_label || item.unit_short_name || item.unit) ||
    defaultUnitOption.value

  item.unit_uuid = opt?.value || ''
  item.unit_label = opt?.label || ''
  item.unit_short_name = opt?.shortName || ''

  if ('unit' in item) {
    delete item.unit
  }

  return item
}

// Update labor total function
const updateLaborTotal = () => {
  // This is called when values change
  // The total is computed automatically via laborTotalAmount computed property
}

// Helper functions to provide material items as options to ItemSelect and SequenceSelect
// This ensures saved items are always available in the dropdown even if not in preferred items
const getMaterialItemOptionsForItem = (currentItem: any) => {
  // If the current item has an item_uuid but might not be in preferred items,
  // create an option from the material item data itself
  if (currentItem.item_uuid && currentItem.name) {
    return [{
      uuid: currentItem.item_uuid,
      item_uuid: currentItem.item_uuid,
      item_name: currentItem.name,
      name: currentItem.name,
      item_sequence: currentItem.sequence,
      sequence: currentItem.sequence,
      unit: currentItem.unit_label,
      unit_uuid: currentItem.unit_uuid,
      unit_price: currentItem.unit_price,
      description: currentItem.description
    }]
  }
  return []
}

const getMaterialItemOptionsForSequence = (currentItem: any) => {
  // If the current item has an item_uuid and sequence but might not be in preferred items,
  // create an option from the material item data itself
  if (currentItem.item_uuid && currentItem.sequence) {
    return [{
      uuid: currentItem.item_uuid,
      item_uuid: currentItem.item_uuid,
      item_name: currentItem.name,
      name: currentItem.name,
      item_sequence: currentItem.sequence,
      sequence: currentItem.sequence,
      unit: currentItem.unit_label,
      unit_uuid: currentItem.unit_uuid,
      unit_price: currentItem.unit_price,
      description: currentItem.description
    }]
  }
  return []
}

// Material item management functions
const addMaterialItem = () => {
  const opt = defaultUnitOption.value
  materialItems.value.push({
    item_uuid: '',
    item_type: '',
    sequence: '',
    name: '',
    description: '',
    model_number: '',
    unit_price: 0,
    unit_uuid: opt.value || '',
    unit_label: opt.label || '',
    unit_short_name: opt.shortName || '',
    quantity: 1,
    total: 0,
    is_preferred: false,
  })
}

const handleMaterialItemUnitChange = (
  index: number,
  option?: { value: string; label: string; shortName?: string; uom?: any }
) => {
  const target = materialItems.value[index]
  if (!target) return

  const resolved =
    option
      ? {
          value: option.value,
          label: option.label,
          shortName: option.shortName || option.uom?.short_name || option.label,
        }
      : resolveUnitOption(target.unit_uuid, target.unit_label)
  target.unit_uuid = resolved?.value || ''
  target.unit_label = resolved?.label || ''
  target.unit_short_name = resolved?.shortName || ''

  updateMaterialItemTotal(index)
}

// Load preferred items for the selected cost code
// Helper function to enrich saved material items with current item_sequence from preferred items
const enrichMaterialItemsWithSequence = (savedItems: any[], costCodeUuid: string) => {
  // Find the cost code configuration
  const costCodeConfig = configurations.value.find(config => config.uuid === costCodeUuid)
  
  if (!costCodeConfig || !costCodeConfig.preferred_items) {
    return savedItems
  }
  
  // Create a map of preferred items by uuid for quick lookup
  const preferredItemsMap: Map<string, any> = new Map(
    costCodeConfig.preferred_items.map((item: any) => [String(item.uuid), item as any])
  )
  
  // Enrich saved items with current sequence values
  return savedItems.map((savedItem: any) => {
    const preferredItem = preferredItemsMap.get(savedItem.item_uuid)
    
    if (preferredItem && preferredItem.item_sequence) {
      return {
        ...savedItem,
        sequence: preferredItem.item_sequence
      }
    }
    
    return savedItem
  })
}

const loadPreferredItems = () => {
  if (!selectedCostCode.value) return
  
  // Find the cost code configuration that matches the selected cost code
  const costCodeConfig = configurations.value.find(config => 
    config.uuid === selectedCostCode.value.uuid
  )
  
  if (costCodeConfig && costCodeConfig.preferred_items && costCodeConfig.preferred_items.length > 0) {
    // Convert preferred items to material items format
    materialItems.value = costCodeConfig.preferred_items.map((item: any) => {
      const resolvedUnit = resolveUnitOption(item.unit_uuid, item.unit || item.unit_label || item.unit_short_name)
      const materialItem = normalizeMaterialItem({
        item_uuid: item.uuid || '',
        item_type: item.item_type_uuid || '',
        sequence: item.item_sequence || '', // Load sequence from preferred item
        name: item.item_name || '',
        description: item.description || '',
        model_number: '',
        unit_price: parseFloat(item.unit_price) || 0,
        unit_uuid: resolvedUnit?.value || '',
        unit_label: resolvedUnit?.label || '',
        unit_short_name: resolvedUnit?.shortName || '',
        quantity: 1,
        total: parseFloat(item.unit_price) || 0,
        is_preferred: true,
      })
      
      return materialItem
    })
  } else {
    // If no preferred items, start with empty array
    materialItems.value = []
  }
}

const removeMaterialItem = (index: number) => {
  materialItems.value.splice(index, 1)
}

const duplicateMaterialItem = (index: number) => {
  const item = normalizeMaterialItem(materialItems.value[index] || {})
  materialItems.value.splice(index + 1, 0, { ...item })
}

const updateMaterialItemTotal = (index: number) => {
  const item = materialItems.value[index]
  const unitPrice = parseFloat(String(item.unit_price)) || 0
  const quantity = parseFloat(String(item.quantity)) || 0
  item.total = unitPrice * quantity
}

const handleItemUuidChange = (index: number, itemUuid: string | undefined, option?: any) => {
  const item = materialItems.value[index]
  if (!item) return
  
  // Update item_uuid
  item.item_uuid = itemUuid || ''
  
  // Extract item details from the option
  if (option) {
    // Get item name from option (could be from SequenceSelect or ItemSelect)
    const rawItem = option.raw || option
    if (rawItem) {
      // Update name from item_name or label
      if (rawItem.item_name) {
        item.name = rawItem.item_name
      } else if (rawItem.label) {
        item.name = rawItem.label
      } else if (rawItem.name) {
        item.name = rawItem.name
      }
      
      // Update description if available
      if (rawItem.description) {
        item.description = rawItem.description
      }
      
      // Update unit_price if available
      if (rawItem.unit_price !== null && rawItem.unit_price !== undefined) {
        item.unit_price = parseFloat(String(rawItem.unit_price)) || 0
      }
      
      // Update unit_uuid if available
      if (rawItem.unit_uuid) {
        item.unit_uuid = rawItem.unit_uuid
      } else if (rawItem.unit) {
        // Try to resolve unit from unit label/short_name
        const unitOpt = resolveUnitOption(null, rawItem.unit)
        if (unitOpt && unitOpt.value) {
          item.unit_uuid = unitOpt.value
          item.unit_label = unitOpt.label
          item.unit_short_name = unitOpt.shortName
        }
      }
    }
  }
  
  // Recalculate total
  updateMaterialItemTotal(index)
}

const updateMaterialTotal = () => {
  // This is called when values change
  // The total is computed automatically via materialTotalAmount computed property
}

watch(
  unitOptions,
  () => {
    materialItems.value = materialItems.value.map(normalizeMaterialItem)
  },
  { deep: false }
)

// Apply labor estimate to cost code
const applyLaborEstimate = () => {
  if (!selectedCostCode.value || laborTotalAmount.value === 0) return
  
  // Find and update the cost code in hierarchical data
  hierarchicalDataRef.value.forEach((division: any) => {
    division.costCodes.forEach((costCode: any) => {
      // Check if this is the selected cost code
      if (costCode.uuid === selectedCostCode.value.uuid) {
        // Persist how the labor was calculated
        costCode.estimation_type = laborEstimateType.value
        if (laborEstimateType.value === 'per-room') {
          const rooms = currentProject.value?.no_of_rooms || 0
          const perRoom = parseFloat(String(laborAmountPerRoom.value)) || 0
          costCode.labor_amount_per_room = perRoom
          costCode.labor_rooms_count = rooms
          costCode.labor_amount_per_sqft = 0
          costCode.labor_sq_ft_count = 0
        } else if (laborEstimateType.value === 'per-sqft') {
          const area = currentProject.value?.area_sq_ft || 0
          const perSqft = parseFloat(String(laborAmountPerSqft.value)) || 0
          costCode.labor_amount_per_sqft = perSqft
          costCode.labor_sq_ft_count = area
          costCode.labor_amount_per_room = 0
          costCode.labor_rooms_count = 0
        } else {
          costCode.labor_amount_per_room = 0
          costCode.labor_rooms_count = 0
          costCode.labor_amount_per_sqft = 0
          costCode.labor_sq_ft_count = 0
        }
        costCode.labor_amount = laborTotalAmount.value
        // Auto-calculate total if not in "only_total" mode
        if (!showOnlyTotal.value) {
          const material = parseFloat(costCode.material_amount) || 0
          costCode.total_amount = laborTotalAmount.value + material
        }
        appliedCostCodes.value.add(costCode.uuid)
      }
      
      // Also check sub-cost codes
      if (costCode.subCostCodes) {
        costCode.subCostCodes.forEach((subCostCode: any) => {
          if (subCostCode.uuid === selectedCostCode.value.uuid) {
            subCostCode.estimation_type = laborEstimateType.value
            if (laborEstimateType.value === 'per-room') {
              const rooms = currentProject.value?.no_of_rooms || 0
              const perRoom = parseFloat(String(laborAmountPerRoom.value)) || 0
              subCostCode.labor_amount_per_room = perRoom
              subCostCode.labor_rooms_count = rooms
              subCostCode.labor_amount_per_sqft = 0
              subCostCode.labor_sq_ft_count = 0
            } else if (laborEstimateType.value === 'per-sqft') {
              const area = currentProject.value?.area_sq_ft || 0
              const perSqft = parseFloat(String(laborAmountPerSqft.value)) || 0
              subCostCode.labor_amount_per_sqft = perSqft
              subCostCode.labor_sq_ft_count = area
              subCostCode.labor_amount_per_room = 0
              subCostCode.labor_rooms_count = 0
            } else {
              subCostCode.labor_amount_per_room = 0
              subCostCode.labor_rooms_count = 0
              subCostCode.labor_amount_per_sqft = 0
              subCostCode.labor_sq_ft_count = 0
            }
            subCostCode.labor_amount = laborTotalAmount.value
            // Auto-calculate total if not in "only_total" mode
            if (!showOnlyTotal.value) {
              const material = parseFloat(subCostCode.material_amount) || 0
              subCostCode.total_amount = laborTotalAmount.value + material
            }
            appliedCostCodes.value.add(subCostCode.uuid)
          }
          
          // Check sub-sub-cost codes
          if (subCostCode.subSubCostCodes) {
            subCostCode.subSubCostCodes.forEach((subSubCostCode: any) => {
              if (subSubCostCode.uuid === selectedCostCode.value.uuid) {
                subSubCostCode.estimation_type = laborEstimateType.value
                if (laborEstimateType.value === 'per-room') {
                  const rooms = currentProject.value?.no_of_rooms || 0
                  const perRoom = parseFloat(String(laborAmountPerRoom.value)) || 0
                  subSubCostCode.labor_amount_per_room = perRoom
                  subSubCostCode.labor_rooms_count = rooms
                  subSubCostCode.labor_amount_per_sqft = 0
                  subSubCostCode.labor_sq_ft_count = 0
                } else if (laborEstimateType.value === 'per-sqft') {
                  const area = currentProject.value?.area_sq_ft || 0
                  const perSqft = parseFloat(String(laborAmountPerSqft.value)) || 0
                  subSubCostCode.labor_amount_per_sqft = perSqft
                  subSubCostCode.labor_sq_ft_count = area
                  subSubCostCode.labor_amount_per_room = 0
                  subSubCostCode.labor_rooms_count = 0
                } else {
                  subSubCostCode.labor_amount_per_room = 0
                  subSubCostCode.labor_rooms_count = 0
                  subSubCostCode.labor_amount_per_sqft = 0
                  subSubCostCode.labor_sq_ft_count = 0
                }
                subSubCostCode.labor_amount = laborTotalAmount.value
                // Auto-calculate total if not in "only_total" mode
                if (!showOnlyTotal.value) {
                  const material = parseFloat(subSubCostCode.material_amount) || 0
                  subSubCostCode.total_amount = laborTotalAmount.value + material
                }
                appliedCostCodes.value.add(subSubCostCode.uuid)
              }
            })
          }
        })
      }
    })
  })
  
  // Trigger reactivity update
  nextTick(() => {
    hierarchicalDataRef.value = [...hierarchicalDataRef.value]
  })
  
  // Emit the line items update to trigger recalculation in parent
  emitLineItemsUpdate()
  
  // Don't close modal here, let user click Close explicitly
  // This way they can see the result or make adjustments
}

// Material total amount calculation
const materialTotalAmount = computed(() => {
  if (materialEstimateType.value === 'manual') {
    return parseFloat(String(materialManualAmount.value)) || 0
  } else if (materialEstimateType.value === 'item-wise') {
    return materialItems.value.reduce((total, item) => {
      return total + (parseFloat(item.total) || 0)
    }, 0)
  }
  return 0
})

// Apply material estimate to cost code
const applyMaterialEstimate = () => {
  if (!selectedCostCode.value || materialTotalAmount.value === 0) return
  
  let normalizedItems: any[] = []
  if (materialEstimateType.value === 'item-wise') {
    normalizedItems = materialItems.value.map((item) => normalizeMaterialItem(item))
    materialItems.value = normalizedItems
  }

  // Find and update the cost code in hierarchical data
  hierarchicalDataRef.value.forEach((division: any) => {
    division.costCodes.forEach((costCode: any) => {
      // Check if this is the selected cost code
      if (costCode.uuid === selectedCostCode.value.uuid) {
        // Do NOT overwrite labor estimation_type here; it's reserved for labor
        costCode.material_amount = materialTotalAmount.value
        costCode.material_items = materialEstimateType.value === 'item-wise' ? normalizedItems.map((item) => ({ ...item })) : []
        
        // Auto-calculate total if not in "only_total" mode
        if (!showOnlyTotal.value) {
          const labor = parseFloat(costCode.labor_amount) || 0
          costCode.total_amount = labor + materialTotalAmount.value
        }
        appliedCostCodes.value.add(costCode.uuid)
      }
      
      // Also check sub-cost codes
      if (costCode.subCostCodes) {
        costCode.subCostCodes.forEach((subCostCode: any) => {
          if (subCostCode.uuid === selectedCostCode.value.uuid) {
            // Do NOT overwrite labor estimation_type here; it's reserved for labor
            subCostCode.material_amount = materialTotalAmount.value
          subCostCode.material_items = materialEstimateType.value === 'item-wise' ? normalizedItems.map((item) => ({ ...item })) : []
            
            // Auto-calculate total if not in "only_total" mode
            if (!showOnlyTotal.value) {
              const labor = parseFloat(subCostCode.labor_amount) || 0
              subCostCode.total_amount = labor + materialTotalAmount.value
            }
            appliedCostCodes.value.add(subCostCode.uuid)
          }
          
          // Check sub-sub-cost codes
          if (subCostCode.subSubCostCodes) {
            subCostCode.subSubCostCodes.forEach((subSubCostCode: any) => {
              if (subSubCostCode.uuid === selectedCostCode.value.uuid) {
                // Do NOT overwrite labor estimation_type here; it's reserved for labor
                subSubCostCode.material_amount = materialTotalAmount.value
                subSubCostCode.material_items = materialEstimateType.value === 'item-wise' ? normalizedItems.map((item) => ({ ...item })) : []
                
                // Auto-calculate total if not in "only_total" mode
                if (!showOnlyTotal.value) {
                  const labor = parseFloat(subSubCostCode.labor_amount) || 0
                  subSubCostCode.total_amount = labor + materialTotalAmount.value
                }
                appliedCostCodes.value.add(subSubCostCode.uuid)
              }
            })
          }
        })
      }
    })
  })
  
  // Trigger reactivity update
  nextTick(() => {
    hierarchicalDataRef.value = [...hierarchicalDataRef.value]
  })
  
  // Emit the line items update to trigger recalculation in parent
  emitLineItemsUpdate()
}

// Apply contingency estimate to cost code
const applyContingencyEstimate = () => {
  if (!selectedCostCode.value) return
  
  // Find and update the cost code in hierarchical data
  hierarchicalDataRef.value.forEach((division: any) => {
    division.costCodes.forEach((costCode: any) => {
      // Check if this is the selected cost code
      if (costCode.uuid === selectedCostCode.value.uuid) {
        costCode.contingency_enabled = selectedCostCode.value.contingency_enabled === true
        costCode.contingency_percentage = normalizeContingencyValue(selectedCostCode.value.contingency_percentage)
      }
      
      // Also check sub-cost codes
      if (costCode.subCostCodes) {
        costCode.subCostCodes.forEach((subCostCode: any) => {
          if (subCostCode.uuid === selectedCostCode.value.uuid) {
            subCostCode.contingency_enabled = selectedCostCode.value.contingency_enabled === true
            subCostCode.contingency_percentage = normalizeContingencyValue(selectedCostCode.value.contingency_percentage)
          }
          
          // Check sub-sub-cost codes
          if (subCostCode.subSubCostCodes) {
            subCostCode.subSubCostCodes.forEach((subSubCostCode: any) => {
              if (subSubCostCode.uuid === selectedCostCode.value.uuid) {
                subSubCostCode.contingency_enabled = selectedCostCode.value.contingency_enabled === true
                subSubCostCode.contingency_percentage = normalizeContingencyValue(selectedCostCode.value.contingency_percentage)
              }
            })
          }
        })
      }
    })
  })
  
  // Trigger reactivity update
  nextTick(() => {
    hierarchicalDataRef.value = [...hierarchicalDataRef.value]
  })
  
  // Emit the line items update to trigger recalculation in parent
  emitLineItemsUpdate()
}

// General apply function that routes to appropriate handler
const applyEstimate = () => {
  if (isReadOnly.value) {
    return
  }
  // Apply both, regardless of current tab, if they have values
  if (laborTotalAmount.value > 0) {
    applyLaborEstimate()
  }
  if (materialTotalAmount.value > 0) {
    applyMaterialEstimate()
  }
  // Always apply contingency state if cost code is selected (even if no labor/material)
  if (selectedCostCode.value) {
    applyContingencyEstimate()
  }
  // Close modal after successful application
  setTimeout(() => {
    closeEstimateModal()
  }, 400)
}

// Project settings for column visibility
const currentProject = computed(() => {
  if (!props.projectUuid) return null
  // Try to get from currentProject first (if it's the current project)
  if (projectsStore.currentProject?.uuid === props.projectUuid) {
    return projectsStore.currentProject
  }
  // Otherwise, search in appropriate store based on editingEstimate
  const projects = props.editingEstimate 
    ? projectsStore.projects 
    : estimateCreationStore.projects
  const project = projects.find(p => p.uuid === props.projectUuid)
  return project
})

const showOnlyTotal = computed(() => currentProject.value?.only_total === true)
const showLabor = computed(() => currentProject.value?.enable_labor === true)
const showMaterial = computed(() => currentProject.value?.enable_material === true)
const showTotal = computed(() => true) // Always show totals column

// Estimation type options
const estimationTypeOptions = [
  { label: 'Manual', value: 'manual' },
  { label: 'Formula', value: 'formula' },
  { label: 'Percentage', value: 'percentage' }
]

// Tabs for estimate modal - dynamically filtered based on project settings
const estimateTabs = computed(() => {
  const tabs = []
  
  // Add Labor tab only if enable_labor is true
  if (currentProject.value?.enable_labor) {
    tabs.push({
      label: 'Labor', 
      value: 'labor',
      icon: 'i-heroicons-wrench-screwdriver',
      slot: 'labor' as const
    })
  }
  
  // Add Material tab only if enable_material is true
  if (currentProject.value?.enable_material) {
    tabs.push({
      label: 'Material', 
      value: 'material',
      icon: 'i-heroicons-cube',
      slot: 'material' as const
    })
  }
  
  // Always add Contingency tab
  tabs.push({
    label: 'Contingency', 
    value: 'contingency',
    icon: 'i-heroicons-shield-check',
    slot: 'contingency' as const
  })
  
  return tabs
})

// Computed hierarchical data
const hierarchicalData = computed(() => {
  if (!divisions.value?.length || !configurations.value?.length) return []

  // Split divisions into main vs those excluded from estimates/reports
  const mainDivisions = divisions.value
    .filter(division => division?.is_active !== false && division?.exclude_in_estimates_and_reports !== true)
    .sort((a, b) => (a.division_order || 0) - (b.division_order || 0))

  const excludedDivisionUuids = new Set(
    divisions.value
      .filter(division => division?.is_active !== false && division?.exclude_in_estimates_and_reports === true)
      .map(division => division.uuid)
  )

  const divisionsData = mainDivisions
    .map(division => {
      const divisionConfigurations = configurations.value
        .filter(config => 
          config?.division_uuid === division?.uuid && 
          config?.is_active !== false && 
          !config?.parent_cost_code_uuid
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0))

      const costCodes = divisionConfigurations.map(costCode => {
        const subCostCodes = configurations.value
          .filter(subConfig => 
            subConfig?.parent_cost_code_uuid === costCode?.uuid && 
            subConfig?.is_active !== false
          )
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(subConfig => {
            // Get sub-sub cost codes (third level)
            const subSubCostCodes = configurations.value
              .filter(subSubConfig => 
                subSubConfig?.parent_cost_code_uuid === subConfig?.uuid && 
                subSubConfig?.is_active !== false
              )
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map(subSubConfig => ({
                ...subSubConfig,
                labor_amount: 0,
                material_amount: 0,
                total_amount: 0,
                estimation_type: 'manual',
                labor_amount_per_room: 0,
                labor_rooms_count: 0,
                labor_amount_per_sqft: 0,
                labor_sq_ft_count: 0,
                contingency_enabled: false,
                contingency_percentage: null
              }))

            return {
              ...subConfig,
              labor_amount: 0,
              material_amount: 0,
              total_amount: 0,
              estimation_type: 'manual',
              labor_amount_per_room: 0,
              labor_rooms_count: 0,
              labor_amount_per_sqft: 0,
              labor_sq_ft_count: 0,
              contingency_enabled: false,
              contingency_percentage: null,
              subSubCostCodes
            }
          })

        return {
          ...costCode,
          labor_amount: 0,
          material_amount: 0,
          total_amount: 0,
          estimation_type: 'manual',
          labor_amount_per_room: 0,
          labor_rooms_count: 0,
          labor_amount_per_sqft: 0,
          labor_sq_ft_count: 0,
          contingency_enabled: false,
          contingency_percentage: null,
          subCostCodes
        }
      })

      return {
        ...division,
        costCodes
      }
    })

  // Add "Other Costs" section for:
  // - cost codes without any division
  // - AND cost codes whose division has exclude_in_estimates_and_reports = true
  const otherCostCodes = configurations.value
    .filter(config => 
      (
        !config?.division_uuid || 
        (config?.division_uuid && excludedDivisionUuids.has(config.division_uuid))
      ) &&
      config?.is_active !== false && 
      !config?.parent_cost_code_uuid
    )
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(costCode => {
      const subCostCodes = configurations.value
        .filter(subConfig => 
          subConfig?.parent_cost_code_uuid === costCode?.uuid && 
          subConfig?.is_active !== false
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(subConfig => {
          // Get sub-sub cost codes (third level)
          const subSubCostCodes = configurations.value
            .filter(subSubConfig => 
              subSubConfig?.parent_cost_code_uuid === subConfig?.uuid && 
              subSubConfig?.is_active !== false
            )
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(subSubConfig => ({
              ...subSubConfig,
              labor_amount: 0,
              material_amount: 0,
              total_amount: 0,
              estimation_type: 'manual',
              labor_amount_per_room: 0,
              labor_rooms_count: 0,
              labor_amount_per_sqft: 0,
              labor_sq_ft_count: 0,
              contingency_enabled: false,
              contingency_percentage: null
            }))

          return {
            ...subConfig,
            labor_amount: 0,
            material_amount: 0,
            total_amount: 0,
            estimation_type: 'manual',
            labor_amount_per_room: 0,
            labor_rooms_count: 0,
            labor_amount_per_sqft: 0,
            labor_sq_ft_count: 0,
            contingency_enabled: false,
            contingency_percentage: null,
            subSubCostCodes
          }
        })

      return {
        ...costCode,
        labor_amount: 0,
        material_amount: 0,
        total_amount: 0,
        estimation_type: 'manual',
        labor_amount_per_room: 0,
        labor_rooms_count: 0,
        labor_amount_per_sqft: 0,
        labor_sq_ft_count: 0,
        contingency_enabled: false,
        contingency_percentage: null,
        subCostCodes
      }
    })

  // Add "Other Costs" section if there are cost codes without divisions
  if (otherCostCodes.length > 0) {
    divisionsData.push({
      uuid: 'other-costs',
      division_number: 'OTHER',
      division_name: 'OTHER COSTS',
      division_order: 999, // Place at the end
      description: 'Cost codes not assigned to any division',
      is_active: true,
      // Mark this synthetic division as excluded from main totals
      exclude_in_estimates_and_reports: true,
      costCodes: otherCostCodes
    })
  }

  return divisionsData
})

// Methods
const getDivisionTotal = (division: any) => {
  return division.costCodes.reduce((total: number, costCode: any) => {
    // Only use getCostCodeTotal which already includes all sub-level calculations
    return total + getCostCodeTotal(costCode)
  }, 0)
}

const getDivisionLaborTotal = (division: any) => {
  return division.costCodes.reduce((total: number, costCode: any) => {
    return total + getCostCodeLaborTotal(costCode)
  }, 0)
}

const getDivisionMaterialTotal = (division: any) => {
  return division.costCodes.reduce((total: number, costCode: any) => {
    return total + getCostCodeMaterialTotal(costCode)
  }, 0)
}

const getCostCodeTotal = (costCode: any) => {
  // If cost code has sub-accounts, calculate from sub-accounts
  if (costCode.subCostCodes && costCode.subCostCodes.length > 0) {
    // Sum base totals from sub-cost codes (without contingency)
    return costCode.subCostCodes.reduce((total: number, subCostCode: any) => {
      return total + getSubCostCodeTotal(subCostCode)
    }, 0)
  }
  
  // If only_total is enabled, use the total_amount field directly (without contingency)
  if (showOnlyTotal.value) {
    return parseFloat(costCode.total_amount) || 0
  }
  
  // Otherwise, always calculate from labor + material (without contingency)
  const labor = parseFloat(costCode.labor_amount) || 0
  const material = parseFloat(costCode.material_amount) || 0
  return labor + material
}

const getCostCodeLaborTotal = (costCode: any) => {
  // If cost code has sub-accounts, calculate from sub-accounts
  if (costCode.subCostCodes && costCode.subCostCodes.length > 0) {
    return costCode.subCostCodes.reduce((total: number, subCostCode: any) => {
      return total + getSubCostCodeLaborTotal(subCostCode)
    }, 0)
  }
  // Otherwise return direct labor amount
  return parseFloat(costCode.labor_amount) || 0
}

const getCostCodeMaterialTotal = (costCode: any) => {
  // If cost code has sub-accounts, calculate from sub-accounts
  if (costCode.subCostCodes && costCode.subCostCodes.length > 0) {
    return costCode.subCostCodes.reduce((total: number, subCostCode: any) => {
      return total + getSubCostCodeMaterialTotal(subCostCode)
    }, 0)
  }
  // Otherwise return direct material amount
  return parseFloat(costCode.material_amount) || 0
}

const getSubCostCodeTotal = (subCostCode: any) => {
  // If sub-cost code has sub-sub-cost codes, only calculate from them
  if (subCostCode.subSubCostCodes && subCostCode.subSubCostCodes.length > 0) {
    // Sum base totals from sub-sub-cost codes (without contingency)
    return subCostCode.subSubCostCodes.reduce((total: number, subSubCostCode: any) => {
      return total + getSubSubCostCodeTotal(subSubCostCode)
    }, 0)
  }
  
  // If only_total is enabled, use the total_amount field directly (without contingency)
  if (showOnlyTotal.value) {
    return parseFloat(subCostCode.total_amount) || 0
  }
  
  // Otherwise, always calculate from labor + material (without contingency)
  const labor = parseFloat(subCostCode.labor_amount) || 0
  const material = parseFloat(subCostCode.material_amount) || 0
  return labor + material
}

const getSubCostCodeLaborTotal = (subCostCode: any) => {
  // If sub-cost code has sub-sub-cost codes, calculate from them
  if (subCostCode.subSubCostCodes && subCostCode.subSubCostCodes.length > 0) {
    return subCostCode.subSubCostCodes.reduce((total: number, subSubCostCode: any) => {
      return total + (parseFloat(subSubCostCode.labor_amount) || 0)
    }, 0)
  }
  // Otherwise return direct labor amount
  return parseFloat(subCostCode.labor_amount) || 0
}

const getSubCostCodeMaterialTotal = (subCostCode: any) => {
  // If sub-cost code has sub-sub-cost codes, calculate from them
  if (subCostCode.subSubCostCodes && subCostCode.subSubCostCodes.length > 0) {
    return subCostCode.subSubCostCodes.reduce((total: number, subSubCostCode: any) => {
      return total + (parseFloat(subSubCostCode.material_amount) || 0)
    }, 0)
  }
  // Otherwise return direct material amount
  return parseFloat(subCostCode.material_amount) || 0
}

const getSubSubCostCodeTotal = (subSubCostCode: any) => {
  // If only_total is enabled, use the total_amount field directly (without contingency)
  if (showOnlyTotal.value) {
    return parseFloat(subSubCostCode.total_amount) || 0
  }
  
  // Otherwise, always calculate from labor + material (without contingency)
  const labor = parseFloat(subSubCostCode.labor_amount) || 0
  const material = parseFloat(subSubCostCode.material_amount) || 0
  return labor + material
}

// Helpers for contingency calculations
const getProjectContingencyPercent = (): number => {
  const raw = currentProject.value?.contingency_percentage
  if (raw === null || raw === undefined || raw === '') {
    return 0
  }
  const parsed = parseFloat(String(raw))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

const normalizeContingencyValue = (value: any): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = parseFloat(String(value))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

const getContingencyPercent = (node: any): number => {
  // IMPORTANT: If node has sub-cost codes or sub-sub-cost codes, do NOT apply contingency
  // Contingency should only be applied at leaf nodes (where estimates are entered)
  // This prevents double application when both parent and child have contingency_enabled = true
  if (node?.subCostCodes && node.subCostCodes.length > 0) {
    return 0
  }
  if (node?.subSubCostCodes && node.subSubCostCodes.length > 0) {
    return 0
  }

  if (!node?.contingency_enabled) {
    return 0
  }

  const normalized = normalizeContingencyValue(node.contingency_percentage)
  if (normalized === null) {
    return getProjectContingencyPercent()
  }

  return normalized
}

const getSelectedCostCodeBaseTotal = (): number => {
  if (!selectedCostCode.value) return 0
  const code: any = selectedCostCode.value
  
  // If cost code has sub-cost codes, calculate from them (modal values don't apply to parent)
  if (code.subCostCodes && code.subCostCodes.length > 0) {
    return code.subCostCodes.reduce((t: number, s: any) => t + getBaseSubCostCodeTotal(s), 0)
  }
  
  // For leaf nodes, use current modal state values for reactive calculation
  if (showOnlyTotal.value) {
    // In only_total mode, use saved value (no modal input for total yet)
    return parseFloat(code.total_amount) || 0
  }
  
  // When modal is open, use reactive modal values for real-time calculation
  // Otherwise, use saved values from the cost code
  if (isEstimateModalOpen.value) {
    // Use computed reactive values from modal inputs
    return laborTotalAmount.value + materialTotalAmount.value
  }
  
  // Modal closed, use saved values
  return (parseFloat(code.labor_amount) || 0) + (parseFloat(code.material_amount) || 0)
}

const getBaseSubCostCodeTotal = (sub: any): number => {
  if (sub.subSubCostCodes && sub.subSubCostCodes.length > 0) {
    return sub.subSubCostCodes.reduce((t: number, s: any) => getBaseSubSubCostCodeTotal(s) + t, 0)
  }
  if (showOnlyTotal.value) {
    return parseFloat(sub.total_amount) || 0
  }
  return (parseFloat(sub.labor_amount) || 0) + (parseFloat(sub.material_amount) || 0)
}

const getBaseSubSubCostCodeTotal = (s: any): number => {
  if (showOnlyTotal.value) {
    return parseFloat(s.total_amount) || 0
  }
  return (parseFloat(s.labor_amount) || 0) + (parseFloat(s.material_amount) || 0)
}

const getSelectedCostCodeContingencyPercent = (): number => {
  if (!selectedCostCode.value) return 0
  
  // When modal is open and contingency is enabled, use the current value reactively
  // This ensures the calculation updates as the user types in the input field
  if (isEstimateModalOpen.value && selectedCostCode.value.contingency_enabled) {
    const normalized = normalizeContingencyValue(selectedCostCode.value.contingency_percentage)
    return normalized === null ? getProjectContingencyPercent() : normalized
  }
  
  // Otherwise use the standard getContingencyPercent function
  return getContingencyPercent(selectedCostCode.value)
}

const getSelectedCostCodeTotalWithContingency = (): number => {
  const base = getSelectedCostCodeBaseTotal()
  const pct = getSelectedCostCodeContingencyPercent()
  return base * (1 + pct / 100)
}

const getGrandTotal = () => {
  // Use visibleDivisions to exclude empty divisions
  // If only_total is enabled, sum all total columns
  const mainDivisionsForTotals = visibleDivisions.value.filter(
    (division: any) => division?.exclude_in_estimates_and_reports !== true
  )

  if (showOnlyTotal.value) {
    return mainDivisionsForTotals.reduce((total, division) => {
      return total + getDivisionTotal(division)
    }, 0)
  }
  
  // If only labor is enabled, sum all labor columns
  if (showLabor.value && !showMaterial.value) {
    return mainDivisionsForTotals.reduce((total, division) => {
      return total + getDivisionLaborTotal(division)
    }, 0)
  }
  
  // If only material is enabled, sum all material columns
  if (showMaterial.value && !showLabor.value) {
    return mainDivisionsForTotals.reduce((total, division) => {
      return total + getDivisionMaterialTotal(division)
    }, 0)
  }
  
  // If both labor and material are enabled, sum the total_amount of each cost code
  if (showLabor.value && showMaterial.value) {
    return mainDivisionsForTotals.reduce((total, division) => {
      return total + getDivisionTotal(division)
    }, 0)
  }
  
  // Fallback to total column calculation
  return mainDivisionsForTotals.reduce((total, division) => {
    return total + getDivisionTotal(division)
  }, 0)
}

const getGrandLaborTotal = () => {
  const mainDivisionsForTotals = visibleDivisions.value.filter(
    (division: any) => division?.exclude_in_estimates_and_reports !== true
  )
  return mainDivisionsForTotals.reduce((total, division) => {
    return total + getDivisionLaborTotal(division)
  }, 0)
}

const getGrandMaterialTotal = () => {
  const mainDivisionsForTotals = visibleDivisions.value.filter(
    (division: any) => division?.exclude_in_estimates_and_reports !== true
  )
  return mainDivisionsForTotals.reduce((total, division) => {
    return total + getDivisionMaterialTotal(division)
  }, 0)
}

// Base labor/material (without contingency) for any node
const getBaseLabor = (node: any): number => {
  if (node.subCostCodes && node.subCostCodes.length > 0) {
    return node.subCostCodes.reduce((t: number, sub: any) => t + getBaseLabor(sub), 0)
  }
  if (node.subSubCostCodes && node.subSubCostCodes.length > 0) {
    return node.subSubCostCodes.reduce((t: number, s: any) => t + getBaseLabor(s), 0)
  }
  if (showOnlyTotal.value) return 0
  return parseFloat(node.labor_amount) || 0
}

const getBaseMaterial = (node: any): number => {
  if (node.subCostCodes && node.subCostCodes.length > 0) {
    return node.subCostCodes.reduce((t: number, sub: any) => t + getBaseMaterial(sub), 0)
  }
  if (node.subSubCostCodes && node.subSubCostCodes.length > 0) {
    return node.subSubCostCodes.reduce((t: number, s: any) => t + getBaseMaterial(s), 0)
  }
  if (showOnlyTotal.value) return 0
  return parseFloat(node.material_amount) || 0
}

// Contingency split at a node: allocate by base labor/material proportion
const getNodeContingencySplit = (node: any): { labor: number, material: number } => {
  const pct = getContingencyPercent(node)
  const baseLabor = getBaseLabor(node)
  const baseMaterial = getBaseMaterial(node)
  const laborCont = baseLabor * (pct / 100)
  const materialCont = baseMaterial * (pct / 100)
  return { labor: laborCont, material: materialCont }
}

// Aggregate contingency (labor/material) across hierarchy
const getCostCodeLaborContingency = (node: any): number => {
  let total = 0
  // children first
  if (node.subCostCodes && node.subCostCodes.length > 0) {
    total += node.subCostCodes.reduce((t: number, sub: any) => t + getCostCodeLaborContingency(sub), 0)
  }
  if (node.subSubCostCodes && node.subSubCostCodes.length > 0) {
    total += node.subSubCostCodes.reduce((t: number, s: any) => t + getCostCodeLaborContingency(s), 0)
  }
  // own level
  total += getNodeContingencySplit(node).labor
  return total
}

const getCostCodeMaterialContingency = (node: any): number => {
  let total = 0
  if (node.subCostCodes && node.subCostCodes.length > 0) {
    total += node.subCostCodes.reduce((t: number, sub: any) => t + getCostCodeMaterialContingency(sub), 0)
  }
  if (node.subSubCostCodes && node.subSubCostCodes.length > 0) {
    total += node.subSubCostCodes.reduce((t: number, s: any) => t + getCostCodeMaterialContingency(s), 0)
  }
  total += getNodeContingencySplit(node).material
  return total
}

const getDivisionLaborContingencyTotal = (division: any): number => {
  return division.costCodes.reduce((t: number, costCode: any) => t + getCostCodeLaborContingency(costCode), 0)
}

const getDivisionMaterialContingencyTotal = (division: any): number => {
  return division.costCodes.reduce((t: number, costCode: any) => t + getCostCodeMaterialContingency(costCode), 0)
}

const getGrandLaborContingencyTotal = () => {
  const mainDivisionsForTotals = visibleDivisions.value.filter(
    (division: any) => division?.exclude_in_estimates_and_reports !== true
  )
  return mainDivisionsForTotals.reduce(
    (t, division) => t + getDivisionLaborContingencyTotal(division),
    0
  )
}

const getGrandMaterialContingencyTotal = () => {
  const mainDivisionsForTotals = visibleDivisions.value.filter(
    (division: any) => division?.exclude_in_estimates_and_reports !== true
  )
  return mainDivisionsForTotals.reduce(
    (t, division) => t + getDivisionMaterialContingencyTotal(division),
    0
  )
}

const getCostCodeBaseTotal = (costCode: any) => {
  if (costCode.subCostCodes && costCode.subCostCodes.length > 0) {
    return costCode.subCostCodes.reduce((total: number, subCostCode: any) => {
      return total + getBaseSubCostCodeTotal(subCostCode)
    }, 0)
  }
  if (showOnlyTotal.value) {
    return parseFloat(costCode.total_amount) || 0
  }
  const labor = parseFloat(costCode.labor_amount) || 0
  const material = parseFloat(costCode.material_amount) || 0
  return labor + material
}

const getGrandContingencyTotal = () => {
  // Total contingency is the sum of labor and material contingencies
  return getGrandLaborContingencyTotal() + getGrandMaterialContingencyTotal()
}

// "Other Costs" totals (for divisions marked exclude_in_estimates_and_reports)
const otherDivisionsForTotals = computed(() =>
  visibleDivisions.value.filter(
    (division: any) => division?.exclude_in_estimates_and_reports === true
  )
)

const getOtherGrandTotal = () => {
  const divisions = otherDivisionsForTotals.value
  if (!divisions.length) return 0
  return divisions.reduce((total, division) => total + getDivisionTotal(division), 0)
}

const getOtherGrandLaborTotal = () => {
  const divisions = otherDivisionsForTotals.value
  if (!divisions.length) return 0
  return divisions.reduce(
    (total, division) => total + getDivisionLaborTotal(division),
    0
  )
}

const getOtherGrandMaterialTotal = () => {
  const divisions = otherDivisionsForTotals.value
  if (!divisions.length) return 0
  return divisions.reduce(
    (total, division) => total + getDivisionMaterialTotal(division),
    0
  )
}

const getOtherGrandLaborContingencyTotal = () => {
  const divisions = otherDivisionsForTotals.value
  if (!divisions.length) return 0
  return divisions.reduce(
    (t, division) => t + getDivisionLaborContingencyTotal(division),
    0
  )
}

const getOtherGrandMaterialContingencyTotal = () => {
  const divisions = otherDivisionsForTotals.value
  if (!divisions.length) return 0
  return divisions.reduce(
    (t, division) => t + getDivisionMaterialContingencyTotal(division),
    0
  )
}

const getOtherGrandContingencyTotal = () => {
  return (
    getOtherGrandLaborContingencyTotal() +
    getOtherGrandMaterialContingencyTotal()
  )
}

const getAccordionItems = (costCode: any) => {
  return [{
    label: `Sub Cost Codes (${costCode.subCostCodes.length})`,
    content: '', // This will be replaced by the #body slot
    subCostCodes: costCode.subCostCodes
  }]
}

const getCostCodeAccordionItems = (costCode: any) => {
  return [{
    key: costCode.uuid,
    label: `${costCode.cost_code_number} ${costCode.cost_code_name}`,
    content: '', // This will be replaced by the #body slot
    subCostCodes: costCode.subCostCodes
  }]
}

// Note: Direct input updates are disabled - all changes must go through the estimate modal

// Edit and Delete methods
const editCostCode = (costCode: any): void => {
  // TODO: Implement edit functionality
}

const deleteCostCode = (costCode: any): void => {
  if (isReadOnly.value) return
  if (!costCode) return
  if (costCode?.uuid) {
    deletedUuidsLocal.value.add(costCode.uuid)
    appliedCostCodes.value.delete(costCode.uuid)
    emitDeletedUuids()
    removeCostCodeByUuid(costCode.uuid)
  }
}

const editSubCostCode = (subCostCode: any): void => {
  // TODO: Implement edit functionality
}

const deleteSubCostCode = (subCostCode: any): void => {
  if (isReadOnly.value) return
  if (!subCostCode) return
  if (subCostCode?.uuid) {
    deletedUuidsLocal.value.add(subCostCode.uuid)
    appliedCostCodes.value.delete(subCostCode.uuid)
    emitDeletedUuids()
    removeCostCodeByUuid(subCostCode.uuid)
  }
}

const editSubSubCostCode = (subSubCostCode: any): void => {
  // TODO: Implement edit functionality
}

const deleteSubSubCostCode = (subSubCostCode: any): void => {
  if (isReadOnly.value) return
  if (!subSubCostCode) return
  if (subSubCostCode?.uuid) {
    deletedUuidsLocal.value.add(subSubCostCode.uuid)
    appliedCostCodes.value.delete(subSubCostCode.uuid)
    emitDeletedUuids()
    removeCostCodeByUuid(subSubCostCode.uuid)
  }
}

// Estimate modal function
const openEstimateModal = async (costCode: any): Promise<void> => {
  selectedCostCode.value = costCode
  
  // When editing, ensure we have the configuration with preferred items loaded
  if (props.editingEstimate && costCode.uuid && corpStore.selectedCorporation?.uuid) {
    // Check if we have the config in store with preferred_items
    const getById = configurationsStore.getConfigurationById
    const existingConfig = typeof getById === 'function'
      ? (getById(costCode.uuid) as any)
      : undefined
    
    // If config not in store or doesn't have preferred_items, fetch from API
    if (!existingConfig || !Array.isArray(existingConfig.preferred_items) || existingConfig.preferred_items.length === 0) {
      try {
        const response: any = await $fetch('/api/cost-code-configurations', {
          query: { corporation_uuid: corpStore.selectedCorporation.uuid },
        })
        
        const data = response?.data || response || []
        const config = Array.isArray(data) 
          ? data.find((c: any) => c.uuid === costCode.uuid)
          : null
        
        if (config && config.preferred_items) {
          // Update the store with the fetched configuration
          // This ensures ItemSelect and SequenceSelect can find the preferred items
          await configurationsStore.fetchConfigurations(corpStore.selectedCorporation.uuid, false, false) // Force API fetch
        }
      } catch (err: any) {
        console.error('[EstimateLineItemsTable] Error fetching configuration when opening modal:', err)
      }
    }
  }
  
  // Load existing estimates if they exist
  if (costCode.estimation_type === 'per-room' && (costCode.labor_amount_per_room || costCode.labor_amount_per_room === 0)) {
    laborEstimateType.value = 'per-room'
    laborAmountPerRoom.value = String(costCode.labor_amount_per_room || '')
    laborManualAmount.value = ''
  } else if (costCode.estimation_type === 'per-sqft' && (costCode.labor_amount_per_sqft || costCode.labor_amount_per_sqft === 0)) {
    laborEstimateType.value = 'per-sqft'
    laborAmountPerSqft.value = String(costCode.labor_amount_per_sqft || '')
    laborManualAmount.value = ''
  } else if (costCode.labor_amount && costCode.labor_amount > 0) {
    // Default to manual if not explicitly per-room
    laborManualAmount.value = String(costCode.labor_amount)
    laborEstimateType.value = 'manual'
  } else {
    // Reset to default if no existing values
    laborManualAmount.value = ''
    laborAmountPerRoom.value = ''
    laborAmountPerSqft.value = ''
    laborEstimateType.value = 'manual'
  }

  // Fallback inference if estimation_type is missing but metadata exists
  if (!costCode.estimation_type) {
    const perRoomAmt = parseFloat(costCode.labor_amount_per_room)
    const perSqftAmt = parseFloat(costCode.labor_amount_per_sqft)
    if (!Number.isNaN(perRoomAmt) && perRoomAmt > 0) {
      laborEstimateType.value = 'per-room'
      laborAmountPerRoom.value = String(costCode.labor_amount_per_room || '')
      laborManualAmount.value = ''
    } else if (!Number.isNaN(perSqftAmt) && perSqftAmt > 0) {
      laborEstimateType.value = 'per-sqft'
      laborAmountPerSqft.value = String(costCode.labor_amount_per_sqft || '')
      laborManualAmount.value = ''
    }
  }

  // Load material estimates if they exist
  if (costCode.material_amount && costCode.material_amount > 0) {
    if (costCode.material_items && costCode.material_items.length > 0) {
      materialEstimateType.value = 'item-wise'
      // Enrich saved items with current sequence values from preferred items
      const normalizedItems = costCode.material_items.map((item: any) => normalizeMaterialItem(item))
      materialItems.value = enrichMaterialItemsWithSequence(normalizedItems, costCode.uuid)
      materialManualAmount.value = ''
    } else {
      materialEstimateType.value = 'manual'
      materialManualAmount.value = String(costCode.material_amount)
      materialItems.value = []
    }
  } else {
    // Reset to default if no existing values
    materialManualAmount.value = ''
    materialItems.value = []
    materialEstimateType.value = 'manual'
  }

  // Ensure contingency state is consistent with new default behavior
  if (costCode.contingency_enabled) {
    if (costCode.contingency_percentage === null || costCode.contingency_percentage === undefined || costCode.contingency_percentage === '') {
      costCode.contingency_percentage = getProjectContingencyPercent()
    }
  } else {
    costCode.contingency_percentage = null
  }
  
  // Load preferred items if material tab is selected and item-wise is chosen
  if (activeTab.value === 'material' && materialEstimateType.value === 'item-wise') {
    const hasExisting = Array.isArray((costCode as any).material_items) && (costCode as any).material_items.length > 0
    if (!hasExisting && materialItems.value.length === 0) {
      loadPreferredItems()
    }
  }
  
  // Set initial tab based on what's enabled
  if (currentProject.value?.enable_labor) {
    activeTab.value = 'labor'
  } else if (currentProject.value?.enable_material) {
    activeTab.value = 'material'
  } else {
    activeTab.value = 'contingency'
  }
  
  isEstimateModalOpen.value = true
}

// Close modal handler
const closeEstimateModal = (): void => {
  isEstimateModalOpen.value = false
  selectedCostCode.value = null
  
  // Reset labor estimation state
  laborEstimateType.value = 'manual'
  laborManualAmount.value = ''
  laborAmountPerRoom.value = ''
  laborAmountPerSqft.value = ''
  
  // Reset material estimation state
  materialEstimateType.value = 'manual'
  materialManualAmount.value = ''
  materialItems.value = []
  
  // Reset to first available tab
  if (currentProject.value?.enable_labor) {
    activeTab.value = 'labor'
  } else if (currentProject.value?.enable_material) {
    activeTab.value = 'material'
  } else {
    activeTab.value = 'contingency'
  }
}

const emitLineItemsUpdate = () => {
  const lineItems: any[] = []
  
  // Helper function to emit a single cost code as a line item
  const emitCostCodeAsLineItem = (costCode: any, division: any, isSubCostCode: boolean = false) => {
    // Calculate amounts based on whether it's a sub-cost code or has sub-cost codes
    let calculatedTotal: number
    let laborAmount: number
    let materialAmount: number
    
    if (isSubCostCode) {
      // For sub-cost codes, check if they have sub-sub-cost codes
      if (costCode.subSubCostCodes && costCode.subSubCostCodes.length > 0) {
        // If it has sub-sub-cost codes, calculate from them
        calculatedTotal = getSubCostCodeTotal(costCode)
        laborAmount = getSubCostCodeLaborTotal(costCode)
        materialAmount = getSubCostCodeMaterialTotal(costCode)
      } else {
        // Direct sub-cost code (leaf node) - use its values directly
        laborAmount = parseFloat(costCode.labor_amount) || 0
        materialAmount = parseFloat(costCode.material_amount) || 0
        // Calculate total WITHOUT contingency (contingency is tracked separately)
        if (showOnlyTotal.value) {
          calculatedTotal = parseFloat(costCode.total_amount) || 0
        } else {
          calculatedTotal = laborAmount + materialAmount
        }
      }
    } else {
      // Top-level cost code
      if (costCode.subCostCodes && costCode.subCostCodes.length > 0) {
        // Has sub-cost codes - calculate from them (shouldn't happen in emit, but handle it)
        calculatedTotal = getCostCodeTotal(costCode)
        laborAmount = getCostCodeLaborTotal(costCode)
        materialAmount = getCostCodeMaterialTotal(costCode)
      } else {
        // Direct cost code - use its values directly
        laborAmount = parseFloat(costCode.labor_amount) || 0
        materialAmount = parseFloat(costCode.material_amount) || 0
        // Calculate total WITHOUT contingency (contingency is tracked separately)
        calculatedTotal = showOnlyTotal.value 
          ? (parseFloat(costCode.total_amount) || 0)
          : (laborAmount + materialAmount)
      }
    }
    
    // Only emit if there's a value
    if (laborAmount > 0 || materialAmount > 0 || calculatedTotal > 0) {
      lineItems.push({
        cost_code_uuid: costCode.uuid,
        cost_code_number: costCode.cost_code_number,
        cost_code_name: costCode.cost_code_name,
        division_name: division.division_name,
        description: `${costCode.cost_code_number} ${costCode.cost_code_name}`,
        labor_amount: laborAmount,
        material_amount: materialAmount,
        total_amount: calculatedTotal,
        estimation_type: costCode.estimation_type || 'manual',
        labor_amount_per_room: costCode.labor_amount_per_room || 0,
        labor_rooms_count: costCode.labor_rooms_count || (currentProject.value?.no_of_rooms || 0),
        labor_amount_per_sqft: costCode.labor_amount_per_sqft || 0,
        labor_sq_ft_count: costCode.labor_sq_ft_count || (currentProject.value?.area_sq_ft || 0),
        material_items: costCode.material_items || [],
        metadata: {
          ...(costCode.metadata || {}),
          contingency_enabled: costCode.contingency_enabled === true,
          contingency_percentage: parseFloat(costCode.contingency_percentage) || 0
        },
        contingency_enabled: costCode.contingency_enabled === true,
        contingency_percentage: parseFloat(costCode.contingency_percentage) || 0,
        is_sub_cost_code: isSubCostCode
      })
    }
  }
  
  // Use visibleDivisions to exclude empty divisions when emitting updates
  visibleDivisions.value.forEach((division: any) => {
    division.costCodes.forEach((costCode: any) => {
      // If cost code has sub-cost codes, emit each sub-cost code (and sub-sub-cost codes) separately
      if (costCode.subCostCodes && costCode.subCostCodes.length > 0) {
        costCode.subCostCodes.forEach((subCostCode: any) => {
          // If sub-cost code has sub-sub-cost codes, emit each sub-sub-cost code separately
          if (subCostCode.subSubCostCodes && subCostCode.subSubCostCodes.length > 0) {
            subCostCode.subSubCostCodes.forEach((subSubCostCode: any) => {
              // For sub-sub-cost codes (leaf nodes), emit with their direct values
              const laborAmount = parseFloat(subSubCostCode.labor_amount) || 0
              const materialAmount = parseFloat(subSubCostCode.material_amount) || 0
              // Calculate total WITHOUT contingency (contingency is tracked separately)
              const calculatedTotal = showOnlyTotal.value
                ? (parseFloat(subSubCostCode.total_amount) || 0)
                : (laborAmount + materialAmount)
              
              if (laborAmount > 0 || materialAmount > 0 || calculatedTotal > 0) {
                lineItems.push({
                  cost_code_uuid: subSubCostCode.uuid,
                  cost_code_number: subSubCostCode.cost_code_number,
                  cost_code_name: subSubCostCode.cost_code_name,
                  division_name: division.division_name,
                  description: `${subSubCostCode.cost_code_number} ${subSubCostCode.cost_code_name}`,
                  labor_amount: laborAmount,
                  material_amount: materialAmount,
                  total_amount: calculatedTotal,
                  estimation_type: subSubCostCode.estimation_type || 'manual',
                  labor_amount_per_room: subSubCostCode.labor_amount_per_room || 0,
                  labor_rooms_count: subSubCostCode.labor_rooms_count || (currentProject.value?.no_of_rooms || 0),
                  labor_amount_per_sqft: subSubCostCode.labor_amount_per_sqft || 0,
                  labor_sq_ft_count: subSubCostCode.labor_sq_ft_count || (currentProject.value?.area_sq_ft || 0),
                  material_items: subSubCostCode.material_items || [],
                  metadata: {
                    ...(subSubCostCode.metadata || {}),
                    contingency_enabled: subSubCostCode.contingency_enabled === true,
                    contingency_percentage: parseFloat(subSubCostCode.contingency_percentage) || 0
                  },
                  contingency_enabled: subSubCostCode.contingency_enabled === true,
                  contingency_percentage: parseFloat(subSubCostCode.contingency_percentage) || 0,
                  is_sub_cost_code: true
                })
              }
            })
          } else {
            // Sub-cost code without sub-sub-cost codes - emit it directly
            emitCostCodeAsLineItem(subCostCode, division, true)
          }
        })
      } else {
        // Cost code without sub-cost codes - emit it directly
        emitCostCodeAsLineItem(costCode, division, false)
      }
    })
  })

  emit('update:modelValue', lineItems)
}

// Fetch data - use estimateCreationStore for new estimates, global stores for editing
const fetchData = async () => {
  if (props.editingEstimate) {
    // When editing, use global stores
    if (!corpStore.selectedCorporation?.uuid) {
      divisions.value = []
      configurations.value = []
      return
    }

    loading.value = true
    try {
      await Promise.all([
        divisionsStore.fetchDivisions(corpStore.selectedCorporation.uuid),
        configurationsStore.fetchConfigurations(corpStore.selectedCorporation.uuid)
      ])
      
      divisions.value = divisionsStore.getActiveDivisions(corpStore.selectedCorporation.uuid) || []
      configurations.value = configurationsStore.getActiveConfigurations(corpStore.selectedCorporation.uuid) || []
    } catch (error) {
      console.error('Error fetching cost code data (editing mode):', error)
      divisions.value = []
      configurations.value = []
    } finally {
      loading.value = false
    }
  } else {
    // When creating new, use estimateCreationStore
    if (!estimateCreationStore.selectedCorporationUuid) {
      divisions.value = []
      configurations.value = []
      return
    }

    loading.value = true
    try {
      // Data is already fetched by estimateCreationStore, just use it
      // getActiveDivisions and getActiveConfigurations are computed properties, access them directly
      divisions.value = estimateCreationStore.getActiveDivisions || []
      configurations.value = estimateCreationStore.getActiveConfigurations || []
    } catch (error) {
      console.error('Error loading cost code data from estimate creation store:', error)
      divisions.value = []
      configurations.value = []
    } finally {
      loading.value = false
    }
  }
}

// Watch for corporation changes - use appropriate store based on editingEstimate
watch(() => props.editingEstimate 
  ? corpStore.selectedCorporation?.uuid 
  : estimateCreationStore.selectedCorporationUuid, async (newUuid, oldUuid) => {
  if (newUuid && newUuid !== oldUuid) {
    // Reset population flag on corp change to allow re-populating for another estimate/corp
    hasPopulatedSavedData.value = false
    
    // For new estimates, data is already fetched by estimateCreationStore.setCorporationAndFetchData
    // Just need to load it into local state
    await fetchData()
  }
}, { immediate: true })

// Also watch for changes in estimateCreationStore data arrays to ensure reactivity
watch(() => props.editingEstimate ? null : [
  estimateCreationStore.costCodeDivisions,
  estimateCreationStore.costCodeConfigurations
], () => {
  // When creating new estimate and store data changes, reload local state
  if (!props.editingEstimate && estimateCreationStore.selectedCorporationUuid) {
    fetchData()
  }
}, { deep: true })

// Watch for data changes and emit updates
// Avoid emitting before saved data has been populated to prevent wiping parent model
watch(() => hierarchicalData.value, () => {
  if (hasPopulatedSavedData.value) {
    emitLineItemsUpdate()
  }
}, { deep: true })

// Watch for modelValue changes to populate saved line items when editing
watch(() => props.modelValue, (newLineItems) => {
  // If we've already populated once and now have empty array, don't reset
  if (hasPopulatedSavedData.value && (!newLineItems || newLineItems.length === 0)) {
    return
  }
  
  if (!newLineItems || newLineItems.length === 0) {
    return
  }
  
  // Only populate if hierarchical data exists (cost codes have been loaded)
  if (!hierarchicalData.value || hierarchicalData.value.length === 0) {
    return
  }
  
  // Populate will be handled by the hierarchical data watcher
}, { deep: true })

// Watch for hierarchical data to load and populate saved line items when they're ready
watch(() => [hierarchicalData.value, props.modelValue], ([newHierarchicalData, newModelValue]) => {
  // Update hierarchicalDataRef whenever hierarchical data changes
  if (newHierarchicalData && newHierarchicalData.length > 0) {
    // Only update if we haven't populated data yet, or if this is a fresh load
    if (!hasPopulatedSavedData.value || hierarchicalDataRef.value.length === 0) {
      const clonedData = JSON.parse(JSON.stringify(newHierarchicalData))
      // Filter out deleted cost codes immediately when loading
      if (deletedUuidsLocal.value.size > 0) {
        clonedData.forEach((division: any) => {
          if (division.costCodes && Array.isArray(division.costCodes)) {
            division.costCodes = division.costCodes
              .map((costCode: any) => filterDeletedCostCodes(costCode))
              .filter((costCode: any) => costCode !== null)
          }
        })
      }
      hierarchicalDataRef.value = clonedData
    }
  }
  
  // Check if we have both hierarchical data and modelValue to populate
  if (newHierarchicalData && newHierarchicalData.length > 0 && newModelValue && newModelValue.length > 0 && !hasPopulatedSavedData.value) {
    // Create a map of line items by cost_code_uuid for quick lookup
    const lineItemsMap = new Map(newModelValue.map((item: any) => [item.cost_code_uuid, item]))
    
    let populatedCount = 0
    // Populate the hierarchical data with saved values
    const updatedHierarchicalData = JSON.parse(JSON.stringify(hierarchicalDataRef.value))
    
    updatedHierarchicalData.forEach((division: any) => {
      division.costCodes.forEach((costCode: any) => {
        const savedItem = lineItemsMap.get(costCode.uuid)
        if (savedItem) {
          costCode.labor_amount = savedItem.labor_amount || 0
          costCode.material_amount = savedItem.material_amount || 0
          costCode.total_amount = savedItem.total_amount || 0
          costCode.estimation_type = savedItem.estimation_type || 'manual'
          costCode.labor_amount_per_room = savedItem.labor_amount_per_room || 0
          costCode.labor_rooms_count = savedItem.labor_rooms_count || 0
          costCode.labor_amount_per_sqft = savedItem.labor_amount_per_sqft || 0
          costCode.labor_sq_ft_count = savedItem.labor_sq_ft_count || 0
            // Enrich saved material items with current sequence values from preferred items
            const normalizedItems = (savedItem.material_items || []).map((item: any) => normalizeMaterialItem(item))
            costCode.material_items = enrichMaterialItemsWithSequence(normalizedItems, costCode.uuid)
          costCode.contingency_enabled = savedItem.contingency_enabled === true
          costCode.contingency_percentage = normalizeContingencyValue(savedItem.contingency_percentage)
          populatedCount++
        }
        
        // Also populate sub-cost codes
        if (costCode.subCostCodes) {
          costCode.subCostCodes.forEach((subCostCode: any) => {
            const savedSubItem = lineItemsMap.get(subCostCode.uuid)
            if (savedSubItem) {
              subCostCode.labor_amount = savedSubItem.labor_amount || 0
              subCostCode.material_amount = savedSubItem.material_amount || 0
              subCostCode.total_amount = savedSubItem.total_amount || 0
              subCostCode.estimation_type = savedSubItem.estimation_type || 'manual'
              subCostCode.labor_amount_per_room = savedSubItem.labor_amount_per_room || 0
              subCostCode.labor_rooms_count = savedSubItem.labor_rooms_count || 0
              subCostCode.labor_amount_per_sqft = savedSubItem.labor_amount_per_sqft || 0
              subCostCode.labor_sq_ft_count = savedSubItem.labor_sq_ft_count || 0
              // Enrich saved material items with current sequence values from preferred items
              const normalizedSubItems = (savedSubItem.material_items || []).map((item: any) => normalizeMaterialItem(item))
              subCostCode.material_items = enrichMaterialItemsWithSequence(normalizedSubItems, subCostCode.uuid)
              subCostCode.contingency_enabled = savedSubItem.contingency_enabled === true
              subCostCode.contingency_percentage = normalizeContingencyValue(savedSubItem.contingency_percentage)
              populatedCount++
            }
            
            // Also populate sub-sub-cost codes
            if (subCostCode.subSubCostCodes) {
              subCostCode.subSubCostCodes.forEach((subSubCostCode: any) => {
                const savedSubSubItem = lineItemsMap.get(subSubCostCode.uuid)
                if (savedSubSubItem) {
                  subSubCostCode.labor_amount = savedSubSubItem.labor_amount || 0
                  subSubCostCode.material_amount = savedSubSubItem.material_amount || 0
                  subSubCostCode.total_amount = savedSubSubItem.total_amount || 0
                  subSubCostCode.estimation_type = savedSubSubItem.estimation_type || 'manual'
                  subSubCostCode.labor_amount_per_room = savedSubSubItem.labor_amount_per_room || 0
                  subSubCostCode.labor_rooms_count = savedSubSubItem.labor_rooms_count || 0
                  subSubCostCode.labor_amount_per_sqft = savedSubSubItem.labor_amount_per_sqft || 0
                  subSubCostCode.labor_sq_ft_count = savedSubSubItem.labor_sq_ft_count || 0
                  // Enrich saved material items with current sequence values from preferred items
                  const normalizedSubSubItems = (savedSubSubItem.material_items || []).map((item: any) => normalizeMaterialItem(item))
                  subSubCostCode.material_items = enrichMaterialItemsWithSequence(normalizedSubSubItems, subSubCostCode.uuid)
                  subSubCostCode.contingency_enabled = savedSubSubItem.contingency_enabled === true
                  subSubCostCode.contingency_percentage = normalizeContingencyValue(savedSubSubItem.contingency_percentage)
                  populatedCount++
                }
              })
            }
          })
        }
      })
    })
    
    // Filter out deleted cost codes before setting to hierarchicalDataRef
    if (deletedUuidsLocal.value.size > 0) {
      updatedHierarchicalData.forEach((division: any) => {
        if (division.costCodes && Array.isArray(division.costCodes)) {
          division.costCodes = division.costCodes
            .map((costCode: any) => filterDeletedCostCodes(costCode))
            .filter((costCode: any) => costCode !== null)
        }
      })
    }
    
    // Update the ref with the populated data to trigger reactivity
    hierarchicalDataRef.value = updatedHierarchicalData
    
    // Mark cost codes as applied if they have values (only check non-empty divisions)
    updatedHierarchicalData.filter((division: any) => 
      division.costCodes && Array.isArray(division.costCodes) && division.costCodes.length > 0
    ).forEach((division: any) => {
      division.costCodes.forEach((costCode: any) => {
        const hasLabor = parseFloat(costCode.labor_amount) > 0
        const hasMaterial = parseFloat(costCode.material_amount) > 0
        const hasTotal = parseFloat(costCode.total_amount) > 0
        if (hasLabor || hasMaterial || hasTotal) {
          appliedCostCodes.value.add(costCode.uuid)
        }
        
        // Also check sub-cost codes
        if (costCode.subCostCodes) {
          costCode.subCostCodes.forEach((subCostCode: any) => {
            const hasSubLabor = parseFloat(subCostCode.labor_amount) > 0
            const hasSubMaterial = parseFloat(subCostCode.material_amount) > 0
            const hasSubTotal = parseFloat(subCostCode.total_amount) > 0
            if (hasSubLabor || hasSubMaterial || hasSubTotal) {
              appliedCostCodes.value.add(subCostCode.uuid)
            }
            
            // Check sub-sub-cost codes
            if (subCostCode.subSubCostCodes) {
              subCostCode.subSubCostCodes.forEach((subSubCostCode: any) => {
                const hasSubSubLabor = parseFloat(subSubCostCode.labor_amount) > 0
                const hasSubSubMaterial = parseFloat(subSubCostCode.material_amount) > 0
                const hasSubSubTotal = parseFloat(subSubCostCode.total_amount) > 0
                if (hasSubSubLabor || hasSubSubMaterial || hasSubSubTotal) {
                  appliedCostCodes.value.add(subSubCostCode.uuid)
                }
              })
            }
          })
        }
      })
    })
    
    hasPopulatedSavedData.value = populatedCount > 0
    // Emit once after population so parent form totals update
    emitLineItemsUpdate()
  }
}, { deep: true, immediate: true })

// Watch for project UUID changes to load full project data if needed
watch(() => props.projectUuid, async (newProjectUuid) => {
  if (newProjectUuid && projectsStore.currentProject?.uuid !== newProjectUuid) {
    // Try to load the full project data
    const corpUuid = props.editingEstimate
      ? (corpStore.selectedCorporationId || null)
      : estimateCreationStore.selectedCorporationUuid
    if (corpUuid) {
      await projectsStore.loadCurrentProject(newProjectUuid, corpUuid)
    }
    
    // When creating new estimate and project is selected, ensure cost code data is loaded
    if (!props.editingEstimate && newProjectUuid && estimateCreationStore.selectedCorporationUuid) {
      // Trigger data fetch if not already loaded
      if (divisions.value.length === 0 || configurations.value.length === 0) {
        await fetchData()
      }
    }
  }
}, { immediate: true })

// Watch for deletedUuids prop changes (e.g., when loading a saved estimate)
watch(() => props.deletedUuids, (newDeletedUuids) => {
  // Update local set
  deletedUuidsLocal.value = new Set(newDeletedUuids || [])
  
  // Re-filter the hierarchy to remove deleted items
  if (deletedUuidsLocal.value.size > 0 && hierarchicalDataRef.value.length > 0) {
    const filteredData = hierarchicalDataRef.value.map((division: any) => {
      if (!division.costCodes || !Array.isArray(division.costCodes)) {
        return division
      }
      
      const filteredCostCodes = division.costCodes
        .map((costCode: any) => filterDeletedCostCodes(costCode))
        .filter((costCode: any) => costCode !== null)
      
      return {
        ...division,
        costCodes: filteredCostCodes
      }
    }).filter((division: any) => 
      division.costCodes && Array.isArray(division.costCodes) && division.costCodes.length > 0
    )
    
    hierarchicalDataRef.value = filteredData
    emitLineItemsUpdate()
  }
}, { immediate: true })

// Watch for material estimate type changes to load preferred items
watch(() => materialEstimateType.value, (newType) => {
  if (newType === 'item-wise' && selectedCostCode.value) {
    // Load preferred items ONLY if there are no existing items saved on the cost code
    const hasExisting = Array.isArray((selectedCostCode.value as any).material_items) && (selectedCostCode.value as any).material_items.length > 0
    if (!hasExisting && materialItems.value.length === 0) {
      loadPreferredItems()
    }
  }
})

// Watch for active tab changes to load preferred items when switching to material tab
watch(() => activeTab.value, (newTab) => {
  if (newTab === 'material' && materialEstimateType.value === 'item-wise' && selectedCostCode.value) {
    const hasExisting = Array.isArray((selectedCostCode.value as any).material_items) && (selectedCostCode.value as any).material_items.length > 0
    if (!hasExisting && materialItems.value.length === 0) {
      loadPreferredItems()
    }
  }
})

onMounted(async () => {
  // For editing, use global stores
  if (props.editingEstimate && corpStore.selectedCorporation?.uuid) {
    await fetchData()
    // ensure UOM list is present
    if (!uomStore.getActiveUOM(corpStore.selectedCorporation.uuid)?.length) {
      uomStore.fetchUOM(corpStore.selectedCorporation.uuid).catch(() => {})
    }
  }
  // For new estimates, use estimateCreationStore
  else if (!props.editingEstimate && estimateCreationStore.selectedCorporationUuid) {
    await fetchData()
    // UOM is already loaded in estimateCreationStore
  }
})
</script>
