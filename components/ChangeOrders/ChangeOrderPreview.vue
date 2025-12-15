<template>
  <div class="space-y-3 print:space-y-1.5">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Loading change order...</p>
      </div>
    </div>

    <div v-else-if="error" class="py-4">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="error"
        :description="'Please try again.'"
      />
    </div>

    <div v-else-if="changeOrderDetail" class="print:p-4 print:space-y-2">
      <!-- Header Section -->
      <div class="mb-3 print:mb-2">
        <div class="text-center mb-2 print:mb-1">
          <h1 class="text-xl print:text-lg font-bold text-gray-900">CHANGE ORDER</h1>
        </div>
        
        <div class="grid grid-cols-2 gap-3 print:gap-2 mb-3 print:mb-2">
          <div>
            <div class="text-xs print:text-[10px] font-semibold text-gray-700">CO #</div>
            <div class="text-base print:text-sm font-mono">{{ changeOrderDetail.co_number || 'N/A' }}</div>
          </div>
          <div>
            <div class="text-xs print:text-[10px] font-semibold text-gray-700">Created Date</div>
            <div class="text-base print:text-sm">{{ formatDate(changeOrderDetail.created_date) }}</div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 print:gap-2 mb-3 print:mb-2">
          <div>
            <div class="text-xs print:text-[10px] font-semibold text-gray-700">Project Name</div>
            <div class="text-sm print:text-xs">{{ projectName || '' }}</div>
          </div>
          <div>
            <div class="text-xs print:text-[10px] font-semibold text-gray-700">Project #</div>
            <div class="text-sm print:text-xs">{{ projectId || '' }}</div>
          </div>
          <div>
            <div class="text-xs print:text-[10px] font-semibold text-gray-700">Original PO #</div>
            <div class="text-sm print:text-xs">{{ originalPONumber || '' }}</div>
          </div>
        </div>
      </div>

      <!-- Address Sections Grid -->
      <div class="grid grid-cols-2 gap-3 print:gap-2 mb-3 print:mb-2">
        <!-- Source Section -->
        <div class="border border-gray-300 rounded p-2 print:p-1.5">
          <h3 class="text-xs print:text-[10px] font-bold text-gray-900 mb-1.5 print:mb-1 uppercase">Source</h3>
          <div class="space-y-1 print:space-y-0.5 text-xs print:text-[10px]">
            <div class="font-semibold text-gray-900">{{ vendorName || '' }}</div>
            <div class="text-gray-700 whitespace-pre-line">{{ sourceAddress }}</div>
            <div v-if="sourcePhone" class="text-gray-700">
              <span class="font-semibold">Phone:</span> {{ sourcePhone }}
            </div>
            <div v-if="sourceFax" class="text-gray-700">
              <span class="font-semibold">Fax:</span> {{ sourceFax }}
            </div>
            <div v-if="sourceContact" class="text-gray-700">
              <span class="font-semibold">Contact:</span> {{ sourceContact }}
            </div>
            <div v-if="sourceEmail" class="text-gray-700">
              <span class="font-semibold">E-mail:</span> {{ sourceEmail }}
            </div>
          </div>
        </div>

        <!-- Manufacturer Section -->
        <div class="border border-gray-300 rounded p-2 print:p-1.5">
          <h3 class="text-xs print:text-[10px] font-bold text-gray-900 mb-1.5 print:mb-1 uppercase">Manufacturer</h3>
          <div class="space-y-1 print:space-y-0.5 text-xs print:text-[10px]">
            <div class="font-semibold text-gray-900">{{ vendorName || '' }}</div>
            <div class="text-gray-700 whitespace-pre-line">{{ manufacturerAddress }}</div>
            <div v-if="manufacturerPhone" class="text-gray-700">
              <span class="font-semibold">Phone:</span> {{ manufacturerPhone }}
            </div>
            <div v-if="manufacturerFax" class="text-gray-700">
              <span class="font-semibold">Fax:</span> {{ manufacturerFax }}
            </div>
            <div v-if="manufacturerContact" class="text-gray-700">
              <span class="font-semibold">Contact:</span> {{ manufacturerContact }}
            </div>
            <div v-if="manufacturerEmail" class="text-gray-700">
              <span class="font-semibold">E-mail:</span> {{ manufacturerEmail }}
            </div>
          </div>
        </div>

        <!-- Ship To Section -->
        <div class="border border-gray-300 rounded p-2 print:p-1.5">
          <h3 class="text-xs print:text-[10px] font-bold text-gray-900 mb-1.5 print:mb-1 uppercase">Ship to</h3>
          <div class="space-y-1 print:space-y-0.5 text-xs print:text-[10px]">
            <div class="text-gray-700 whitespace-pre-line">{{ shipToAddress }}</div>
            <div v-if="shipToContact" class="text-gray-700">
              <span class="font-semibold">Contact:</span> {{ shipToContact }}
            </div>
            <div v-if="shipToPhone" class="text-gray-700">
              <span class="font-semibold">Phone:</span> {{ shipToPhone }}
            </div>
            <div v-if="shipToFax" class="text-gray-700">
              <span class="font-semibold">Fax:</span> {{ shipToFax }}
            </div>
            <div v-if="shipToEmail" class="text-gray-700">
              <span class="font-semibold">E-mail:</span> {{ shipToEmail }}
            </div>
          </div>
        </div>

        <!-- Bill To Section -->
        <div class="border border-gray-300 rounded p-2 print:p-1.5">
          <h3 class="text-xs print:text-[10px] font-bold text-gray-900 mb-1.5 print:mb-1 uppercase">Bill to</h3>
          <div class="space-y-1 print:space-y-0.5 text-xs print:text-[10px]">
            <div class="text-gray-700 whitespace-pre-line">{{ billToAddress }}</div>
            <div v-if="billToContact" class="text-gray-700">
              <span class="font-semibold">Contact:</span> {{ billToContact }}
            </div>
            <div v-if="billToPhone" class="text-gray-700">
              <span class="font-semibold">Phone:</span> {{ billToPhone }}
            </div>
            <div v-if="billToFax" class="text-gray-700">
              <span class="font-semibold">Fax:</span> {{ billToFax }}
            </div>
            <div v-if="billToEmail" class="text-gray-700">
              <span class="font-semibold">E-mail:</span> {{ billToEmail }}
            </div>
          </div>
        </div>
      </div>

      <!-- Freight/Terms/Shipping Instructions/Delivery Date/Currency Table -->
      <div class="mt-3 print:mt-2 mb-3 print:mb-2">
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-left text-xs print:text-[10px] font-semibold">Freight</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-left text-xs print:text-[10px] font-semibold">Terms</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-left text-xs print:text-[10px] font-semibold">Shipping Instructions</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-left text-xs print:text-[10px] font-semibold">Delivery Date</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-left text-xs print:text-[10px] font-semibold">Currency</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-xs print:text-[10px]">{{ freightDisplay || '' }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-xs print:text-[10px]">{{ termsDisplay || '' }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-xs print:text-[10px]">{{ shippingInstructionsDisplay || '' }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-xs print:text-[10px]">{{ deliveryDateDisplay || '' }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-xs print:text-[10px]">{{ currencyDisplay }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Approval Requirements Section -->
      <div v-if="hasApprovalRequirements" class="mb-3 print:mb-2">
        <div class="text-xs print:text-[10px] text-gray-700">
          <span class="font-semibold">Required Item(s) for Approval Prior to Fabrication on</span>
          <span v-for="(item, index) in itemsWithApprovalRequirements" :key="index">
            <span v-if="index > 0">, </span>
            <span class="font-semibold">&lt;&lt;{{ item.name || item.item_name || 'Item' }}&gt;&gt;</span>
          </span>
          <span v-if="approvalRequirementsText"> {{ approvalRequirementsText }}</span>
        </div>
      </div>

      <!-- CO Items Section (Material) -->
      <div v-if="!isLaborCO && coItems.length > 0" class="mt-3 print:mt-2">
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-left text-xs print:text-[10px] font-semibold">Item Name</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-left text-xs print:text-[10px] font-semibold">Description</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-semibold">Unit Price</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-left text-xs print:text-[10px] font-semibold">Unit</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-semibold">Quantity</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="coItems.length === 0">
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-xs print:text-[10px]" colspan="6"></td>
            </tr>
            <tr v-for="(item, index) in coItems" :key="index">
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-xs print:text-[10px]">{{ item.name || item.item_name || '' }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-xs print:text-[10px]">{{ item.description || '' }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-mono">{{ item.co_unit_price ? formatCurrency(item.co_unit_price) : '' }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-left text-xs print:text-[10px]">{{ item.unit_label || item.unit || '' }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px]">{{ formatQuantity(item.co_quantity) }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-mono font-semibold">{{ item.co_total ? formatCurrency(item.co_total) : '' }}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- CO Total Breakdown -->
        <div class="mt-2 print:mt-1.5 flex justify-end">
          <div class="w-full max-w-md border border-gray-300 rounded p-2 print:p-1.5">
            <div class="space-y-1 print:space-y-0.5">
              <!-- Item Total -->
              <div class="flex justify-between text-xs print:text-[10px]">
                <span class="font-semibold text-gray-700">CO Item Total:</span>
                <span class="font-mono">{{ formatCurrency(coItemTotal) }}</span>
              </div>
              
              <!-- Charges Breakdown -->
              <template v-if="chargesTotal > 0">
                <div v-if="freightChargesAmount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Freight:</span>
                  <span class="font-mono">{{ formatCurrency(freightChargesAmount) }}</span>
                </div>
                <div v-if="packingChargesAmount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Packing:</span>
                  <span class="font-mono">{{ formatCurrency(packingChargesAmount) }}</span>
                </div>
                <div v-if="customDutiesAmount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Custom Duties:</span>
                  <span class="font-mono">{{ formatCurrency(customDutiesAmount) }}</span>
                </div>
                <div v-if="otherChargesAmount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Other:</span>
                  <span class="font-mono">{{ formatCurrency(otherChargesAmount) }}</span>
                </div>
                <div class="flex justify-between text-xs print:text-[10px] border-t border-gray-200 pt-0.5 print:pt-0.5 mt-0.5 print:mt-0.5">
                  <span class="font-semibold text-gray-700">Charges Total:</span>
                  <span class="font-mono font-semibold">{{ formatCurrency(chargesTotal) }}</span>
                </div>
              </template>
              
              <!-- Tax Breakdown -->
              <template v-if="taxTotal > 0">
                <div v-if="salesTax1Amount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Sales Tax 1:</span>
                  <span class="font-mono">{{ formatCurrency(salesTax1Amount) }}</span>
                </div>
                <div v-if="salesTax2Amount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Sales Tax 2:</span>
                  <span class="font-mono">{{ formatCurrency(salesTax2Amount) }}</span>
                </div>
                <div class="flex justify-between text-xs print:text-[10px] border-t border-gray-200 pt-0.5 print:pt-0.5 mt-0.5 print:mt-0.5">
                  <span class="font-semibold text-gray-700">Tax Total:</span>
                  <span class="font-mono font-semibold">{{ formatCurrency(taxTotal) }}</span>
                </div>
              </template>
              
              <!-- Total CO Amount -->
              <div class="flex justify-between text-sm print:text-xs font-bold border-t-2 border-gray-400 pt-1 print:pt-0.5 mt-1 print:mt-0.5">
                <span class="text-gray-900">CO Total:</span>
                <span class="font-mono">{{ formatCurrency(coTotal) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Labor CO Items Section -->
      <div v-if="isLaborCO && laborItems.length > 0" class="mt-3 print:mt-2">
        <h3 class="text-base print:text-sm font-bold text-gray-900 mb-2 print:mb-1.5">Labor CO Items</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-left text-xs print:text-[10px] font-semibold">Cost Code</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-semibold">PO Amount</th>
              <th class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-semibold">CO Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in laborItems" :key="index">
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-xs print:text-[10px]">{{ item.cost_code_label || `${item.cost_code_number} ${item.cost_code_name}`.trim() }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-mono">{{ formatCurrency(item.po_amount || 0) }}</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-mono font-semibold">{{ formatCurrency(item.co_amount || 0) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bg-gray-50">
              <td colspan="2" class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-semibold">Total CO Amount:</td>
              <td class="border border-gray-300 px-2 print:px-1 py-1 print:py-0.5 text-right text-xs print:text-[10px] font-mono font-semibold">{{ formatCurrency(laborTotal) }}</td>
            </tr>
          </tfoot>
        </table>
        
        <!-- CO Total Breakdown for Labor CO -->
        <div class="mt-2 print:mt-1.5 flex justify-end">
          <div class="w-full max-w-md border border-gray-300 rounded p-2 print:p-1.5">
            <div class="space-y-1 print:space-y-0.5">
              <!-- Labor Total -->
              <div class="flex justify-between text-xs print:text-[10px]">
                <span class="font-semibold text-gray-700">Labor Total:</span>
                <span class="font-mono">{{ formatCurrency(laborTotal) }}</span>
              </div>
              
              <!-- Charges Breakdown -->
              <template v-if="chargesTotal > 0">
                <div v-if="freightChargesAmount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Freight:</span>
                  <span class="font-mono">{{ formatCurrency(freightChargesAmount) }}</span>
                </div>
                <div v-if="packingChargesAmount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Packing:</span>
                  <span class="font-mono">{{ formatCurrency(packingChargesAmount) }}</span>
                </div>
                <div v-if="customDutiesAmount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Custom Duties:</span>
                  <span class="font-mono">{{ formatCurrency(customDutiesAmount) }}</span>
                </div>
                <div v-if="otherChargesAmount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Other:</span>
                  <span class="font-mono">{{ formatCurrency(otherChargesAmount) }}</span>
                </div>
                <div class="flex justify-between text-xs print:text-[10px] border-t border-gray-200 pt-0.5 print:pt-0.5 mt-0.5 print:mt-0.5">
                  <span class="font-semibold text-gray-700">Charges Total:</span>
                  <span class="font-mono font-semibold">{{ formatCurrency(chargesTotal) }}</span>
                </div>
              </template>
              
              <!-- Tax Breakdown -->
              <template v-if="taxTotal > 0">
                <div v-if="salesTax1Amount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Sales Tax 1:</span>
                  <span class="font-mono">{{ formatCurrency(salesTax1Amount) }}</span>
                </div>
                <div v-if="salesTax2Amount > 0" class="flex justify-between text-xs print:text-[10px] pl-3 print:pl-2">
                  <span class="text-gray-600">Sales Tax 2:</span>
                  <span class="font-mono">{{ formatCurrency(salesTax2Amount) }}</span>
                </div>
                <div class="flex justify-between text-xs print:text-[10px] border-t border-gray-200 pt-0.5 print:pt-0.5 mt-0.5 print:mt-0.5">
                  <span class="font-semibold text-gray-700">Tax Total:</span>
                  <span class="font-mono font-semibold">{{ formatCurrency(taxTotal) }}</span>
                </div>
              </template>
              
              <!-- Total CO Amount -->
              <div class="flex justify-between text-sm print:text-xs font-bold border-t-2 border-gray-400 pt-1 print:pt-0.5 mt-1 print:mt-0.5">
                <span class="text-gray-900">CO Total:</span>
                <span class="font-mono">{{ formatCurrency(coTotal) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Approvals Section -->
      <div class="mt-4 print:mt-3">
        <!-- Header -->
        <div class="flex justify-between items-center mb-2 print:mb-1.5">
          <h2 class="text-base print:text-sm font-bold text-gray-900">APPROVALS</h2>
          <div class="text-xs print:text-[10px] font-semibold text-gray-900">
            APPROVED FOR CO Total : <span class="font-mono">{{ formatCurrency(coTotal) }}</span>
          </div>
        </div>

        <!-- Approvals Content -->
        <div class="grid grid-cols-2 gap-4 print:gap-3">
          <!-- Left Column: APPROVED BY -->
          <div class="space-y-2 print:space-y-1.5">
            <div class="text-xs print:text-[10px] font-semibold text-gray-900">APPROVED BY :</div>
            
            <div class="space-y-2 print:space-y-1.5">
              <div>
                <div class="text-xs print:text-[10px] text-gray-700 mb-0.5 print:mb-0.5">Agent / Entity</div>
                <div class="border-b-2 border-gray-400 pb-0.5 print:pb-0.5 min-h-[20px] print:min-h-[16px]"></div>
              </div>
              
              <div>
                <div class="text-xs print:text-[10px] text-gray-700 mb-0.5 print:mb-0.5">Date</div>
                <div class="border-b-2 border-gray-400 pb-0.5 print:pb-0.5 min-h-[20px] print:min-h-[16px]"></div>
              </div>
            </div>
          </div>

          <!-- Right Column: APPROVED BY VENDOR -->
          <div class="space-y-2 print:space-y-1.5">
            <div class="text-xs print:text-[10px] font-semibold text-gray-900">APPROVED BY VENDOR :</div>
            
            <div class="space-y-2 print:space-y-1.5">
              <div>
                <div class="text-xs print:text-[10px] text-gray-700 mb-0.5 print:mb-0.5">Date</div>
                <div class="border-b-2 border-gray-400 pb-0.5 print:pb-0.5 min-h-[20px] print:min-h-[16px]"></div>
              </div>
              
              <div>
                <div class="text-xs print:text-[10px] text-gray-700 mb-0.5 print:mb-0.5">Company Name</div>
                <div class="border-b-2 border-gray-400 pb-0.5 print:pb-0.5 min-h-[20px] print:min-h-[16px]"></div>
              </div>
              
              <div>
                <div class="text-xs print:text-[10px] text-gray-700 mb-0.5 print:mb-0.5">Signature</div>
                <div class="border-b-2 border-gray-400 pb-0.5 print:pb-0.5 min-h-[20px] print:min-h-[16px]"></div>
              </div>
              
              <div>
                <div class="text-xs print:text-[10px] text-gray-700 mb-0.5 print:mb-0.5">Shipping Date :</div>
                <div class="border-b-2 border-gray-400 pb-0.5 print:pb-0.5 min-h-[20px] print:min-h-[16px]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Terms and Conditions Section -->
      <div v-if="selectedTermsAndCondition" class="mt-4 print:mt-3">
        <div class="border-t-2 border-gray-400 pt-3 print:pt-2">
          <h2 class="text-base print:text-sm font-bold text-gray-900 mb-2 print:mb-1.5">TERMS AND CONDITIONS</h2>
          <div 
            class="prose prose-sm max-w-none text-xs print:text-[10px] text-gray-700"
            v-html="selectedTermsAndCondition.content"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useCorporationStore } from '@/stores/corporations'
import { useTermsAndConditionsStore } from '@/stores/termsAndConditions'
import { useFreightStore } from '@/stores/freightGlobal'

interface Props {
  changeOrder?: any
  changeOrderUuid?: string
}

const props = defineProps<Props>()

const { formatDate } = useDateFormat()
const { formatCurrency, currencyCode } = useCurrencyFormat()
const corporationStore = useCorporationStore()
const termsAndConditionsStore = useTermsAndConditionsStore()
const freightStore = useFreightStore()

const loading = ref(false)
const error = ref<string | null>(null)
const changeOrderDetail = ref<any | null>(null)
const vendorDetail = ref<any | null>(null)
const projectDetail = ref<any | null>(null)
const shippingAddress = ref<any | null>(null)
const billingAddress = ref<any | null>(null)

const load = async () => {
  error.value = null
  if (props.changeOrder) {
    changeOrderDetail.value = props.changeOrder
    await loadRelatedData()
    return
  }
  if (props.changeOrderUuid) {
    await fetchDetail(props.changeOrderUuid)
  }
}

const fetchDetail = async (uuid: string) => {
  loading.value = true
  try {
    const response: any = await $fetch(`/api/change-orders/${uuid}`, { method: 'GET' })
    if (response?.data) {
      changeOrderDetail.value = response.data
      
      // Fetch CO items separately for Material COs
      const coType = (response.data.co_type || '').toUpperCase()
      if (coType !== 'LABOR') {
        try {
          const itemsResponse: any = await $fetch(`/api/change-order-items?change_order_uuid=${uuid}`, { method: 'GET' })
          if (itemsResponse?.data && Array.isArray(itemsResponse.data)) {
            // Map items to ensure all fields are accessible
            changeOrderDetail.value.co_items = itemsResponse.data.map((item: any) => ({
              ...item,
              name: item.item_name || item.name || '',
              item_name: item.item_name || item.name || '',
              unit_label: item.unit_label || item.unit || '',
              unit: item.unit_label || item.unit || '',
              co_quantity: item.co_quantity ?? item.quantity ?? null,
              co_unit_price: item.co_unit_price ?? item.unit_price ?? null,
              co_total: item.co_total ?? item.total ?? null,
            }))
          } else {
            changeOrderDetail.value.co_items = []
          }
        } catch (itemsError) {
          console.error('Failed to load CO items:', itemsError)
          changeOrderDetail.value.co_items = []
        }
      } else {
        // For Labor CO, fetch labor items
        try {
          const laborItemsResponse: any = await $fetch(`/api/labor-change-order-items?change_order_uuid=${uuid}`, { method: 'GET' })
          if (laborItemsResponse?.data && Array.isArray(laborItemsResponse.data)) {
            changeOrderDetail.value.labor_co_items = laborItemsResponse.data
          } else {
            changeOrderDetail.value.labor_co_items = []
          }
        } catch (laborError) {
          console.error('Failed to load labor CO items:', laborError)
          changeOrderDetail.value.labor_co_items = []
        }
      }
      
      await loadRelatedData()
    } else {
      throw new Error('Change order not found')
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load change order'
  } finally {
    loading.value = false
  }
}

const loadRelatedData = async () => {
  if (!changeOrderDetail.value) return

  const co = changeOrderDetail.value

  // Fetch vendor details
  if (co.vendor_uuid && co.corporation_uuid) {
    try {
      const vendorResponse: any = await $fetch(`/api/purchase-orders/vendors?corporation_uuid=${co.corporation_uuid}`, { method: 'GET' })
      if (vendorResponse?.data && Array.isArray(vendorResponse.data)) {
        const vendor = vendorResponse.data.find((v: any) => v.uuid === co.vendor_uuid)
        if (vendor) {
          vendorDetail.value = vendor
        }
      }
    } catch (e) {
      console.error('Failed to load vendor:', e)
    }
  }

  // Fetch project details
  if (co.project_uuid) {
    try {
      const projectResponse: any = await $fetch(`/api/projects/${co.project_uuid}`, { method: 'GET' })
      if (projectResponse?.data) {
        projectDetail.value = projectResponse.data
      }
    } catch (e) {
      console.error('Failed to load project:', e)
    }
  }

  // Fetch project addresses
  if (co.project_uuid) {
    try {
      const addressResponse: any = await $fetch(`/api/projects/addresses?project_uuid=${co.project_uuid}`, { method: 'GET' })
      if (addressResponse?.data && Array.isArray(addressResponse.data)) {
        // Find shipping address
        if (co.shipping_address_uuid) {
          const addr = addressResponse.data.find((a: any) => a.uuid === co.shipping_address_uuid)
          if (addr) {
            shippingAddress.value = addr
          }
        }
        // Find billing address (use shipping if not set)
        if (co.billing_address_uuid) {
          const addr = addressResponse.data.find((a: any) => a.uuid === co.billing_address_uuid)
          if (addr) {
            billingAddress.value = addr
          }
        } else if (shippingAddress.value) {
          billingAddress.value = shippingAddress.value
        }
      }
    } catch (e) {
      console.error('Failed to load addresses:', e)
    }
  }
}

const formatAddress = (address: any): string => {
  if (!address) return ''
  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.city,
    address.state,
    address.zip_code,
    address.country
  ].filter(Boolean)
  return parts.join(', ').toUpperCase()
}

const formatQuantity = (qty: any): string => {
  if (qty === null || qty === undefined || qty === '') return ''
  return String(qty)
}

const projectName = computed(() => {
  return changeOrderDetail.value?.project_name || projectDetail.value?.project_name || ''
})

const projectId = computed(() => {
  return changeOrderDetail.value?.project_id || projectDetail.value?.project_id || ''
})

const originalPONumber = computed(() => {
  return changeOrderDetail.value?.po_number || ''
})

const vendorName = computed(() => {
  return changeOrderDetail.value?.vendor_name || vendorDetail.value?.vendor_name || ''
})

const sourceAddress = computed(() => {
  if (!vendorDetail.value) return ''
  const parts = [
    vendorDetail.value.vendor_address,
    vendorDetail.value.vendor_city,
    vendorDetail.value.vendor_state,
    vendorDetail.value.vendor_zip,
    vendorDetail.value.vendor_country
  ].filter(Boolean)
  return parts.join(', ').toUpperCase()
})

const manufacturerAddress = computed(() => {
  return sourceAddress.value
})

const sourcePhone = computed(() => {
  return vendorDetail.value?.vendor_phone || ''
})

const manufacturerPhone = computed(() => {
  return sourcePhone.value
})

const sourceFax = computed(() => {
  return vendorDetail.value?.vendor_fax || ''
})

const manufacturerFax = computed(() => {
  return sourceFax.value
})

const sourceContact = computed(() => {
  return vendorDetail.value?.vendor_contact_name || ''
})

const manufacturerContact = computed(() => {
  return sourceContact.value
})

const sourceEmail = computed(() => {
  return vendorDetail.value?.vendor_email || ''
})

const manufacturerEmail = computed(() => {
  return sourceEmail.value
})

const shipToAddress = computed(() => {
  if (shippingAddress.value) {
    return formatAddress(shippingAddress.value).toUpperCase()
  }
  return ''
})

const shipToContact = computed(() => {
  return shippingAddress.value?.contact_person || ''
})

const shipToPhone = computed(() => {
  return shippingAddress.value?.phone || ''
})

const shipToFax = computed(() => {
  return shippingAddress.value?.fax || ''
})

const shipToEmail = computed(() => {
  return shippingAddress.value?.email || ''
})

const billToAddress = computed(() => {
  if (billingAddress.value) {
    return formatAddress(billingAddress.value).toUpperCase()
  }
  return shipToAddress.value
})

const billToContact = computed(() => {
  return billingAddress.value?.contact_person || ''
})

const billToPhone = computed(() => {
  return billingAddress.value?.phone || ''
})

const billToFax = computed(() => {
  return billingAddress.value?.fax || ''
})

const billToEmail = computed(() => {
  return billingAddress.value?.email || ''
})

const isLaborCO = computed(() => {
  const coType = (changeOrderDetail.value?.co_type || '').toUpperCase()
  return coType === 'LABOR'
})

const coItems = computed(() => {
  if (!changeOrderDetail.value) return []
  const items = Array.isArray(changeOrderDetail.value.co_items) 
    ? changeOrderDetail.value.co_items 
    : []
  // Filter out removed items
  const removed = Array.isArray(changeOrderDetail.value.removed_co_items)
    ? changeOrderDetail.value.removed_co_items
    : []
  const removedKeys = new Set(removed.map((item: any) => {
    const key = `${item.cost_code_uuid || ''}|${item.item_uuid || ''}|${item.model_number || ''}`
    return key.toLowerCase()
  }))
  return items.filter((item: any) => {
    const key = `${item.cost_code_uuid || ''}|${item.item_uuid || ''}|${item.model_number || ''}`
    return !removedKeys.has(key.toLowerCase())
  })
})

const laborItems = computed(() => {
  if (!changeOrderDetail.value) return []
  return Array.isArray(changeOrderDetail.value.labor_co_items)
    ? changeOrderDetail.value.labor_co_items
    : []
})

const coItemTotal = computed(() => {
  if (isLaborCO.value) {
    return laborItems.value.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.co_amount) || 0)
    }, 0)
  }
  return coItems.value.reduce((sum: number, item: any) => {
    return sum + (parseFloat(item.co_total) || 0)
  }, 0)
})

const laborTotal = computed(() => {
  return laborItems.value.reduce((sum: number, item: any) => {
    return sum + (parseFloat(item.co_amount) || 0)
  }, 0)
})

// Helper to get value from financial_breakdown or direct field
const getFinancialValue = (path: string, fallbackPath?: string): number => {
  const co = changeOrderDetail.value
  if (!co) return 0
  
  // Try financial_breakdown first
  const breakdown = co.financial_breakdown
  if (breakdown && typeof breakdown === 'object') {
    const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], breakdown)
    if (value !== null && value !== undefined) {
      return parseFloat(value) || 0
    }
  }
  
  // Fallback to direct field
  const directValue = fallbackPath ? co[fallbackPath] : co[path]
  return parseFloat(directValue) || 0
}

// Individual charge amounts
const freightChargesAmount = computed(() => {
  return getFinancialValue('charges.freight.amount', 'freight_charges_amount')
})

const packingChargesAmount = computed(() => {
  return getFinancialValue('charges.packing.amount', 'packing_charges_amount')
})

const customDutiesAmount = computed(() => {
  return getFinancialValue('charges.custom_duties.amount', 'custom_duties_charges_amount')
})

const otherChargesAmount = computed(() => {
  return getFinancialValue('charges.other.amount', 'other_charges_amount')
})

// Individual tax amounts
const salesTax1Amount = computed(() => {
  return getFinancialValue('sales_taxes.sales_tax_1.amount', 'sales_tax_1_amount')
})

const salesTax2Amount = computed(() => {
  return getFinancialValue('sales_taxes.sales_tax_2.amount', 'sales_tax_2_amount')
})

const chargesTotal = computed(() => {
  const co = changeOrderDetail.value
  if (!co) return 0
  
  // Try financial_breakdown first
  const breakdown = co.financial_breakdown
  if (breakdown && typeof breakdown === 'object' && breakdown.totals?.charges_total) {
    return parseFloat(breakdown.totals.charges_total) || 0
  }
  
  // Fallback to direct field or calculate from individual charges
  const directTotal = parseFloat(co.charges_total) || 0
  if (directTotal > 0) return directTotal
  
  // Calculate from individual charges if available
  return freightChargesAmount.value + packingChargesAmount.value + customDutiesAmount.value + otherChargesAmount.value
})

const taxTotal = computed(() => {
  const co = changeOrderDetail.value
  if (!co) return 0
  
  // Try financial_breakdown first
  const breakdown = co.financial_breakdown
  if (breakdown && typeof breakdown === 'object' && breakdown.totals?.tax_total) {
    return parseFloat(breakdown.totals.tax_total) || 0
  }
  
  // Fallback to direct field or calculate from individual taxes
  const directTotal = parseFloat(co.tax_total) || 0
  if (directTotal > 0) return directTotal
  
  // Calculate from individual taxes if available
  return salesTax1Amount.value + salesTax2Amount.value
})

// Calculate CO Total from components if not available
const calculatedCOTotal = computed(() => {
  return coItemTotal.value + chargesTotal.value + taxTotal.value
})

// Use stored total_co_amount if available, otherwise calculate it
const coTotal = computed(() => {
  const co = changeOrderDetail.value
  if (!co) return 0
  
  // Try financial_breakdown first
  const breakdown = co.financial_breakdown
  if (breakdown && typeof breakdown === 'object' && breakdown.totals?.total_co_amount) {
    const storedTotal = parseFloat(breakdown.totals.total_co_amount) || 0
    if (storedTotal > 0) return storedTotal
  }
  
  // Try direct field
  const directTotal = parseFloat(co.total_co_amount) || 0
  if (directTotal > 0) return directTotal
  
  // Calculate from components as fallback
  return calculatedCOTotal.value
})

// Freight/Terms/Shipping Instructions/Delivery Date/Currency display
const freightDisplay = computed(() => {
  const co = changeOrderDetail.value
  if (!co) return ''
  
  // First check if freight text value exists
  if (co.freight && String(co.freight).trim() !== '') {
    return co.freight
  }
  
  // If not, try to resolve from freight_uuid
  if (co.freight_uuid) {
    const freightRecord = freightStore.getFreightByUuid(String(co.freight_uuid))
    if (freightRecord?.ship_via) {
      return freightRecord.ship_via
    }
  }
  
  return ''
})

const termsDisplay = computed(() => {
  const co = changeOrderDetail.value
  if (!co || !co.credit_days) return ''
  const creditDays = String(co.credit_days).toUpperCase()
  const termsMap: Record<string, string> = {
    'NET_15': 'Net 15',
    'NET_25': 'Net 25',
    'NET_30': 'Net 30',
    'NET_45': 'Net 45',
    'NET_60': 'Net 60',
  }
  return termsMap[creditDays] || creditDays.replace(/_/g, ' ')
})

const shippingInstructionsDisplay = computed(() => {
  const co = changeOrderDetail.value
  if (!co) return ''
  return co.shipping_instructions || ''
})

const deliveryDateDisplay = computed(() => {
  const co = changeOrderDetail.value
  if (!co || !co.estimated_delivery_date) return ''
  return formatDate(co.estimated_delivery_date)
})

const currencyDisplay = computed(() => {
  return currencyCode.value || 'USD'
})

// Selected terms and conditions for preview
const selectedTermsAndCondition = computed(() => {
  if (!changeOrderDetail.value?.terms_and_conditions_uuid) {
    return null
  }
  // Ensure terms and conditions are loaded
  if (termsAndConditionsStore.termsAndConditions.length === 0) {
    termsAndConditionsStore.fetchTermsAndConditions()
  }
  return termsAndConditionsStore.getTermsAndConditionById(changeOrderDetail.value.terms_and_conditions_uuid) || null
})

// Approval requirements
const itemsWithApprovalRequirements = computed(() => {
  if (!changeOrderDetail.value || isLaborCO.value) return []
  const items = coItems.value
  return items.filter((item: any) => {
    const approvalChecks = item.approval_checks || item.approval_checks_uuids || []
    return Array.isArray(approvalChecks) && approvalChecks.length > 0
  })
})

const hasApprovalRequirements = computed(() => {
  return itemsWithApprovalRequirements.value.length > 0
})

const approvalRequirementsText = computed(() => {
  return 'Seaming Diagram, Strike-off'
})

watch(() => [props.changeOrder, props.changeOrderUuid], () => {
  load()
}, { immediate: true })

onMounted(async () => {
  // Ensure freight store is loaded for resolving freight_uuid
  if (freightStore.freight.length === 0) {
    try {
      await freightStore.fetchFreight()
    } catch (e) {
      console.error('Failed to load freight data:', e)
    }
  }
  
  if (!changeOrderDetail.value) load()
})
</script>

<style scoped>
/* Print optimizations */
@media print {
  /* Remove all unnecessary spacing */
  * {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  
  /* Ensure proper page breaks */
  .page-break-after {
    page-break-after: always;
  }
  
  /* Prevent page breaks inside important sections */
  table {
    page-break-inside: avoid;
  }
  
  /* Optimize spacing for print */
  .space-y-4 > * + * {
    margin-top: 0.5rem !important;
  }
  
  .space-y-2 > * + * {
    margin-top: 0.25rem !important;
  }
  
  .space-y-1 > * + * {
    margin-top: 0.125rem !important;
  }
  
  /* Reduce border thickness for print */
  .border {
    border-width: 0.5px !important;
  }
  
  .border-2 {
    border-width: 1px !important;
  }
}
</style>

