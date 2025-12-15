<template>
  <div>
    <div v-if="corpStore.selectedCorporation" class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600">Currency:</span>
          <div class="flex items-center space-x-1">
            <span class="text-lg font-bold text-gray-800">{{ currencySymbol }}</span>
            <span class="text-sm text-gray-600 font-mono">{{ currencyCode }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <div class="max-w-sm">
          <UInput
            v-model="globalFilter"
            placeholder="Search accounts..."
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
          :disabled="!chartStore.accounts.length"
        >
          Delete All Accounts
        </UButton>

        <UButton
          icon="material-symbols:add-rounded"
          size="xs"
          color="primary"
          variant="solid"
          @click="showModal = true"
        >
          Add Account
        </UButton>
        </div>
      </div>
    </div>

    <div v-else class="text-gray-500">No corporation selected.</div>

    <!-- Chart of Accounts Table -->
    <div v-if="corpStore.selectedCorporation && chartStore.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-7 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-7 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100">
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-32" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-5 w-20 rounded-full" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-40" />
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

    <div v-else-if="chartStore.error">
      <p class="text-red-500">Error: {{ chartStore.error }}</p>
    </div>

    <div v-else-if="chartStore.accounts.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        :pagination-options="paginationOptions"
        :data="filteredAccounts" 
        :columns="columns" 
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination - only show if more than 10 records -->
      <div v-if="shouldShowPagination(filteredAccounts.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <!-- Page Size Selector -->
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
        
        <!-- Pagination Component -->
        <UPagination v-bind="getPaginationProps(table)" />
        
        <!-- Page Info -->
        <div class="text-sm text-gray-600">
          {{ getPageInfo(table, 'accounts').value }}
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p class="text-gray-500 text-lg font-medium">No chart of accounts found</p>
      <p class="text-gray-400 text-sm">Get started by adding your first account</p>
    </div>

    <!-- Add/Edit Account Modal -->
    <UModal 
      v-model:open="showModal" 
      :title="editingAccount ? 'Edit Account' : 'Add New Account'"
      description="Configure account details for your chart of accounts."
      @update:open="closeModal"
      :ui="{
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-6xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)] rounded-lg shadow-lg ring ring-default overflow-hidden'
      }"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Corporation Name - Full Width -->
          <div>
            <label
              for="selected-corporation-name"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Corporation Name
            </label>
            <UInput
              id="selected-corporation-name"
              v-model="getCorporationName"
              disabled
              variant="subtle"
              placeholder="Corporation Name"
              class="w-full"
            />
          </div>
          
          <!-- Three Column Layout -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Column 1 - Core Fields -->
            <div class="space-y-5">
              <div>
                <label
                  for="account-code"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Account Code *
                </label>
                <UInput
                  id="account-code"
                  v-model="form.code"
                  variant="subtle"
                  placeholder="e.g., 1100, 2100"
                  class="w-full"
                  required
                />
              </div>

              <div>
                <label
                  for="account-name"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Account Name *
                </label>
                <UInput
                  id="account-name"
                  v-model="form.account_name"
                  variant="subtle"
                  placeholder="e.g., Cash & Bank, Accounts Payable"
                  class="w-full"
                  required
                />
              </div>

              <div>
                <label
                  for="account-type"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Account Type *
                </label>
                <USelect
                  id="account-type"
                  v-model="form.account_type"
                  :items="accountTypeOptions"
                  variant="subtle"
                  placeholder="Select account type"
                  icon="i-heroicons-tag"
                  class="w-full"
                  required
                />
                <p class="text-xs text-gray-500 mt-2">
                  Select the main category for this account (Asset, Liability, Equity, Revenue, Expense)
                </p>
              </div>
            </div>

            <!-- Column 2 - Financial Fields -->
            <div class="space-y-5">
              <div>
                <label
                  for="parent-account"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Parent Account
                </label>
                <UInput
                  id="parent-account"
                  v-model="form.parent_account"
                  variant="subtle"
                  placeholder="e.g., WEBSTER BANK, Non-Management"
                  class="w-full"
                />
                <p class="text-xs text-gray-500 mt-2">
                  Optional: Enter parent account name for hierarchical grouping
                </p>
              </div>

              <div>
                <label
                  for="opening-balance"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Opening Balance ({{ currencyCode }})
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="text-gray-500 text-sm">{{ currencySymbol }}</span>
                  </div>
                  <UInput
                    id="opening-balance"
                    v-model.number="form.opening_balance"
                    type="number"
                    step="0.01"
                    variant="subtle"
                    placeholder="0.00"
                    class="w-full pl-8"
                  />
                </div>
                <p class="text-xs text-gray-500 mt-2">
                  Enter the initial balance for this account (positive for assets/expenses, negative for liabilities/equity/revenue)
                </p>
              </div>
            </div>

            <!-- Column 3 - Additional Details -->
            <div class="space-y-5">
              <div>
                <label
                  for="bank-account-number"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Bank Account Number
                </label>
                <UInput
                  id="bank-account-number"
                  v-model="form.bank_account_number"
                  variant="subtle"
                  placeholder="e.g., 1234567890"
                  class="w-full"
                />
                <p class="text-xs text-gray-500 mt-2">
                  Optional: Enter the bank account number if applicable
                </p>
              </div>

              <div>
                <label
                  for="box-1099"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  1099 Box Classification
                </label>
                <USelect
                  id="box-1099"
                  v-model="form.box_1099"
                  :items="box1099Options"
                  variant="subtle"
                  placeholder="Select 1099 box"
                  icon="i-heroicons-document-text"
                  class="w-full"
                />
                <p class="text-xs text-gray-500 mt-2">
                  Select the appropriate 1099 tax form box for this account
                </p>
              </div>
            </div>
          </div>

          <!-- Notes - Full Width -->
          <div>
            <label
              for="notes"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes / Example
            </label>
            <UTextarea
              id="notes"
              v-model="form.notes"
              variant="subtle"
              placeholder="e.g., Main cash account, Guest receivables"
              class="w-full"
              :rows="3"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="error" variant="soft" @click="closeModal"
            >Cancel</UButton
          >
          <UButton color="primary" @click="submitAccount">
            {{ editingAccount ? "Update" : "Add" }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Import CSV Modal -->
    <UModal 
      v-model:open="showImportModal" 
      title="Import Chart of Accounts from CSV"
      description="Upload a CSV file to bulk import chart of accounts data."
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
              <p class="text-gray-400 text-sm mb-4">
                <strong>Required:</strong> Account Code, Account Name, Account Type<br>
                <strong>Optional:</strong> Category (Parent Account), Sub-Category, Opening Balance, Description, Bank Account Number, 1099 Box<br>
                <span class="text-xs">Note: Account Type must be one of: Asset, Liability, Equity, Revenue, Expense</span><br>
                <span class="text-xs">Tip: Use parentheses for negative balances: (1,000.00) = -1000.00</span>
              </p>
              
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
                Account Code,Account Name,Account Type,Category,Sub-Category,Opening Balance,Description,Bank Account Number,1099 Box<br>
                10010,Auction Funds,Asset,,,20000.00,Auction funds,1234567890,Not Applicable<br>
                10025,WB-0235 Wagner,Asset,WEBSTER BANK,Current Asset,0.00,Sub-account,,Not Applicable<br>
                40000,Transient,Revenue,,,0.00,Room revenue,,Box 1: Rents (MISC)
              </div>
              <p class="text-xs text-gray-500 mt-2">
                <strong>Required:</strong> Account Code, Account Name, Account Type<br>
                <strong>Optional:</strong> Category (Parent Account), Sub-Category, Opening Balance, Description, Bank Account Number, 1099 Box<br>
                <strong>Account Types:</strong> Must be one of: Asset, Liability, Equity, Revenue, Expense<br>
                <strong>Balance Format:</strong> Supports commas (1,000.00) and parentheses for negatives ((1,000.00) = -1000.00)<br>
                <strong>1099 Box:</strong> Leave empty or use "Not Applicable" if not applicable
              </p>
            </div>
          </div>

          <!-- CSV Preview Section -->
          <div v-else class="space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-700">Preview ({{ csvData.length }} accounts)</h4>
              
              <!-- Success Message (centered, small) -->
              <div v-if="!validationErrors.length" class="bg-green-50 border border-green-200 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                <svg class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm font-medium text-green-800">All {{ csvData.length }} accounts are valid and ready to import!</span>
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
            {{ importing ? 'Importing...' : `Import ${csvData.length} Accounts` }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteModal" 
      title="Confirm Delete Account"
      description="This action cannot be undone. The account will be permanently removed."
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
              <h3 class="text-lg font-medium text-red-800">Delete Account</h3>
              <p class="text-sm text-red-700">
                Are you sure you want to delete this account? This action cannot be undone.
              </p>
            </div>
          </div>
          
          <div v-if="accountToDelete" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-700 mb-2">Account Details:</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Code:</span>
                <span class="ml-2 font-mono font-medium">{{ accountToDelete.code }}</span>
              </div>
              <div>
                <span class="text-gray-500">Name:</span>
                <span class="ml-2 font-medium">{{ accountToDelete.account_name }}</span>
              </div>
              <div>
                <span class="text-gray-500">Parent Account:</span>
                <span class="ml-2">{{ accountToDelete.parent_account || '-' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Account Type:</span>
                <span class="ml-2">{{ accountToDelete.account_type }}</span>
              </div>
            </div>
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
            {{ deleting ? 'Deleting...' : 'Delete Account' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete All Accounts Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteAllModal"
      title="Confirm Delete All Accounts"
      description="This will permanently delete all accounts for the selected corporation. This action cannot be undone."
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
              <h3 class="text-lg font-medium text-red-800">Delete All Accounts</h3>
              <p class="text-sm text-red-700">
                This will permanently delete <strong>ALL {{ chartStore.accounts.length }} accounts</strong> for this corporation. This action cannot be undone.
              </p>
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
              This is a destructive action that will remove all chart of accounts data. Make sure you have a backup if needed.
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
            {{ deletingAll ? 'Deleting All...' : `Delete All ${chartStore.accounts.length} Accounts` }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Import Default Accounts Confirmation Modal -->
    <UModal 
      v-model:open="showImportDefaultModal"
      title="Import Default Chart of Accounts"
      description="This will import all default chart of accounts into your corporation's chart of accounts."
    >
      <template #body>
        <div class="flex flex-col space-y-4">
          <div class="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-medium text-blue-800">Import Default Accounts</h3>
              <p class="text-sm text-blue-700">
                This will import all default chart of accounts from the system into your corporation's chart of accounts.
              </p>
            </div>
          </div>
          
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 class="font-medium text-gray-700 mb-2">What will be imported:</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li class="flex items-center gap-2">
                <span class="text-green-500">•</span>
                <span>All standard account codes and names</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-green-500">•</span>
                <span>Account categories (Asset, Liability, Equity, Revenue, Expense)</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-green-500">•</span>
                <span>Sub-categories and descriptions</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-green-500">•</span>
                <span>Standard hotel industry chart of accounts structure</span>
              </li>
            </ul>
          </div>

          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-center gap-2">
              <svg class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span class="text-sm font-medium text-yellow-800">Note</span>
            </div>
            <p class="text-sm text-yellow-700 mt-1">
              If you already have accounts with the same codes, duplicates will be skipped to avoid conflicts.
            </p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="secondary" variant="soft" @click="showImportDefaultModal = false">
            Cancel
          </UButton>
          <UButton 
            color="primary" 
            @click="confirmImportDefault"
            :loading="importingDefault"
          >
            {{ importingDefault ? 'Importing...' : 'Import Default Accounts' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, resolveComponent, onMounted } from "vue";
import { useChartOfAccountsStore } from "@/stores/chartOfAccounts";
import { useCorporationStore } from "@/stores/corporations";
import { useTableStandard, createSortableColumn, createActionColumn } from '@/composables/useTableStandard'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import type { TableColumn } from '@nuxt/ui'
import Papa from 'papaparse';
import { sampleChartOfAccountsData } from '@/utils/sampleChartOfAccountsData';

const chartStore = useChartOfAccountsStore();
const corpStore = useCorporationStore();
const { formatCurrency, currencySymbol, currencyCode } = useCurrencyFormat();
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

const UButton = resolveComponent('UButton')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')
const USelect = resolveComponent('USelect')

const showModal = ref(false);
const editingAccount = ref<null | number>(null);
const globalFilter = ref('');
const form = ref({
  code: "",
  account_name: "",
  account_type: "",
  parent_account: "",
  sub_category: "",
  notes: "",
  opening_balance: 0,
  is_header: false,
  bank_account_number: "",
  box_1099: "Not Applicable",
});

// CSV Import related variables
const showImportModal = ref(false);
const csvData = ref<any[]>([]);
const validationErrors = ref<string[]>([]);
const importing = ref(false);
const fileInput = ref<HTMLInputElement>();

// Delete confirmation modal variables
const showDeleteModal = ref(false);
const accountToDelete = ref<any>(null);
const deleting = ref(false);

// Delete all accounts modal variables
const showDeleteAllModal = ref(false);
const deletingAll = ref(false);

// Import default accounts modal variables
const showImportDefaultModal = ref(false);
const importingDefault = ref(false);

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

// Import option related variables
const importOption = ref('use-default');

// Account Type options for the select dropdown
const accountTypeOptions = [
  { label: "Asset", value: "Asset" },
  { label: "Liability", value: "Liability" },
  { label: "Equity", value: "Equity" },
  { label: "Revenue", value: "Revenue" },
  { label: "Expense", value: "Expense" }
];

// 1099 Box options for the select dropdown
const box1099Options = [
  { label: "Not Applicable", value: "Not Applicable" },
  { label: "Box 1: Rents (MISC)", value: "Box 1: Rents (MISC)" },
  { label: "Box 1: Nonemployee Compensation (NEC)", value: "Box 1: Nonemployee Compensation (NEC)" },
  { label: "Box 2: Royalties (MISC)", value: "Box 2: Royalties (MISC)" },
  { label: "Box 2: Direct Sales (NEC)", value: "Box 2: Direct Sales (NEC)" },
  { label: "Box 3: Other Income (MISC)", value: "Box 3: Other Income (MISC)" },
  { label: "Box 4: Federal income tax withheld (NEC)", value: "Box 4: Federal income tax withheld (NEC)" },
  { label: "Box 4: Federal income tax withheld (MISC)", value: "Box 4: Federal income tax withheld (MISC)" },
  { label: "Box 5: State tax withheld (NEC)", value: "Box 5: State tax withheld (NEC)" },
  { label: "Box 5: Fishing Boat Proceeds (MISC)", value: "Box 5: Fishing Boat Proceeds (MISC)" },
  { label: "Box 6: Medical and health care payments (MISC)", value: "Box 6: Medical and health care payments (MISC)" },
  { label: "Box 7: Direct Sales (MISC)", value: "Box 7: Direct Sales (MISC)" },
  { label: "Box 8: Substitute Payments (MISC)", value: "Box 8: Substitute Payments (MISC)" },
  { label: "Box 9: Crop Insurance Proceeds (MISC) Clone to other Properties ?", value: "Box 9: Crop Insurance Proceeds (MISC) Clone to other Properties ?" },
  { label: "Box 9: Crop Insurance Proceeds (MISC)", value: "Box 9: Crop Insurance Proceeds (MISC)" },
  { label: "Box 10: Gross proceeds paid to an attorney (MISC)", value: "Box 10: Gross proceeds paid to an attorney (MISC)" },
  { label: "Box 13: Excess golden parachute payments (MISC)", value: "Box 13: Excess golden parachute payments (MISC)" },
  { label: "Box 15: State tax withheld (MISC)", value: "Box 15: State tax withheld (MISC)" },
];


// Import options for the select dropdown
const importOptions = [
  { 
    label: "Use Default", 
    value: "use-default",
    icon: "i-heroicons-document-text"
  },
  { 
    label: "Import CSV", 
    value: "import-csv",
    icon: "material-symbols:upload-file"
  }
];

// Computed property for filtered accounts based on global filter
const filteredAccounts = computed(() => {
  if (!globalFilter.value.trim()) {
    return chartStore.accounts;
  }

  const searchTerm = globalFilter.value.toLowerCase().trim();
  
  return chartStore.accounts.filter(account => {
    // Search across all relevant fields
    const searchableFields = [
      account.code || '',
      account.account_name || '',
      account.account_type || '',
      account.sub_category || '',
      account.notes || ''
    ];

    // Check if any field contains the search term
    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

// Watchers to sync pageSize with TanStack Table
watch(() => pagination.value.pageSize, (newSize) => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(newSize);
  }
});

watch(globalFilter, () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0); // Reset to first page when filter changes
  }
});

// Loading data for skeleton state
const loadingData = ref([
  {
    id: 1,
    uuid: '1',
    code: '',
    account_name: '',
    category: '',
    sub_category: '',
    notes: ''
  },
  {
    id: 2,
    uuid: '2',
    code: '',
    account_name: '',
    category: '',
    sub_category: '',
    notes: ''
  },
  {
    id: 3,
    uuid: '3',
    code: '',
    account_name: '',
    category: '',
    sub_category: '',
    notes: ''
  }
]);


// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    enableSorting: false,
    cell: ({ row }) => h('div', { class: 'font-mono text-xs text-right text-default' }, row.original.code)
  },
  {
    accessorKey: 'account_name',
    header: 'Account Name',
    enableSorting: false,
    cell: ({ row }) => h('div', { class: 'text-xs text-default' }, row.original.account_name)
  },
  {
    accessorKey: 'parent_account',
    header: 'Parent Account',
    enableSorting: false,
    cell: ({ row }) => h('div', { class: 'text-xs text-muted' }, row.original.parent_account || '-')
  },
  {
    accessorKey: 'account_type',
    header: 'Account Type',
    enableSorting: false,
    cell: ({ row }) => {
      const accountTypeColors: Record<string, string> = {
        'Asset': 'bg-success/10 text-success',
        'Liability': 'bg-error/10 text-error',
        'Equity': 'bg-info/10 text-info',
        'Revenue': 'bg-success/10 text-success',
        'Expense': 'bg-warning/10 text-warning'
      };
      const colorClass = accountTypeColors[row.original.account_type] || 'bg-elevated text-default';
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${colorClass}` 
      }, row.original.account_type)
    }
  },
  {
    accessorKey: 'opening_balance',
    header: 'Opening Balance',
    enableSorting: false,
    cell: ({ row }) => {
      const balance = row.original.opening_balance || 0;
      const formattedBalance = formatCurrency(balance);
      
      const isPositive = balance >= 0;
      const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
      
      return h('div', { 
        class: `text-right font-mono text-sm ${colorClass}` 
      }, formattedBalance);
    }
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    enableSorting: false,
    cell: ({ row }) => h('div', { class: 'text-muted max-w-xs truncate' }, row.original.notes || '-')
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => {
      return h('div', { class: 'flex justify-end space-x-2' }, [
        h(UButton, {
          icon: 'tdesign:edit-filled',
          size: 'xs',
          variant: 'soft',
          color: 'secondary',
          class: 'hover:scale-105 transition-transform',
          onClick: () => editAccount(row.original)
        }, () => ''),
        h(UButton, {
          icon: 'mingcute:delete-fill',
          size: 'xs',
          variant: 'soft',
          color: 'error',
          class: 'hover:scale-105 transition-transform',
          onClick: () => deleteAccount(row.original.id)
        }, () => '')
      ])
    }
  }
];

// Skeleton columns for loading state
const skeletonColumns: TableColumn<any>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: () => h('div', { class: 'h-4 w-16 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'account_name',
    header: 'Account Name',
    cell: () => h('div', { class: 'h-4 w-32 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'account_type',
    header: 'Account Type',
    cell: () => h('div', { class: 'h-4 w-20 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'sub_category',
    header: 'Sub-Category',
    cell: () => h('div', { class: 'h-4 w-24 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'opening_balance',
    header: 'Opening Balance',
    cell: () => h('div', { class: 'h-4 w-20 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'notes',
    header: 'Notes / Example',
    cell: () => h('div', { class: 'h-4 w-40 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    cell: () => h('div', { class: 'flex justify-end space-x-2' }, [
      h('div', { class: 'h-8 w-16 bg-gray-200 rounded' }),
      h('div', { class: 'h-8 w-16 bg-gray-200 rounded' })
    ])
  }
];

// Preview columns for CSV import
const previewColumns: TableColumn<any>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-mono font-medium text-default' }, row.original.code)
  },
  {
    accessorKey: 'account_name',
    header: 'Account Name',
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.account_name)
  },
  {
    accessorKey: 'parent_account',
    header: 'Parent Account',
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-muted' }, row.original.parent_account || '-')
  },
  {
    accessorKey: 'account_type',
    header: 'Account Type',
    cell: ({ row }: { row: { original: any } }) => {
      const accountTypeColors: Record<string, string> = {
        'Asset': 'bg-success/10 text-success',
        'Liability': 'bg-error/10 text-error',
        'Equity': 'bg-info/10 text-info',
        'Revenue': 'bg-success/10 text-success',
        'Expense': 'bg-warning/10 text-warning'
      };
      const colorClass = accountTypeColors[row.original.account_type] || 'bg-elevated text-default';
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${colorClass}` 
      }, row.original.account_type)
    }
  },
  {
    accessorKey: 'opening_balance',
    header: 'Opening Balance',
    cell: ({ row }: { row: { original: any } }) => {
      const balance = row.original.opening_balance || 0;
      const formattedBalance = formatCurrency(balance);
      
      const isPositive = balance >= 0;
      const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
      
      return h('div', { 
        class: `text-right font-mono text-sm ${colorClass}` 
      }, formattedBalance);
    }
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-muted max-w-xs truncate' }, row.original.notes || '-')
  }
];

const getCorporationName = computed(() => {
  return (
    corpStore.selectedCorporation?.corporation_name || "Unnamed Corporation"
  );
});

// Load accounts when corporation changes
watch(
  () => corpStore.selectedCorporation?.uuid,
  (uuid) => {
    if (uuid && process.client) {
      chartStore.fetchAccounts(uuid);
    }
  },
  { immediate: true }
);

// Initialize when component mounts
onMounted(async () => {
  if (process.client) {
    // Ensure the corporation store is ready
    await corpStore.ensureReady();
    
    if (corpStore.selectedCorporation?.uuid) {
      chartStore.fetchAccounts(corpStore.selectedCorporation.uuid);
    }
  }
});

function resetForm() {
  form.value = {
    code: "",
    account_name: "",
    account_type: "",
    parent_account: "",
    sub_category: "",
    notes: "",
    opening_balance: 0,
    is_header: false,
    bank_account_number: "",
    box_1099: "Not Applicable",
  };
  editingAccount.value = null;
}

function handleImportOptionChange() {
  if (importOption.value === 'import-csv') {
    showImportModal.value = true;
  } else if (importOption.value === 'use-default') {
    // Show confirmation modal for "Use Default" option
    if (!corpStore.selectedCorporation) {
      toast.add({
        title: 'Error',
        description: 'No corporation selected',
        icon: 'i-heroicons-exclamation-triangle',
      });
      return;
    }
    showImportDefaultModal.value = true;
  }
  // Reset the select to default value after action
  importOption.value = 'use-default';
}

function closeModal() {
  showModal.value = false;
  resetForm();
}

async function submitAccount() {
  if (!corpStore.selectedCorporation) {
    toast.add({
      title: 'Error',
      description: 'No corporation selected',
      icon: 'i-heroicons-exclamation-triangle',

    });
    return;
  }

  // Validate required fields
  if (!form.value.code || !form.value.account_name || !form.value.account_type) {
    toast.add({
      title: 'Validation Error',
      description: 'Please fill all required fields (Code, Account Name, and Account Type)',
      icon: 'i-heroicons-exclamation-triangle',

    });
    return;
  }

  try {
    const payload = {
      corporation_uuid: corpStore.selectedCorporation.uuid,
      code: form.value.code,
      account_name: form.value.account_name,
      account_type: form.value.account_type,
      parent_account: form.value.parent_account,
      sub_category: form.value.sub_category,
      notes: form.value.notes,
      opening_balance: form.value.opening_balance || 0,
      is_header: form.value.is_header,
      bank_account_number: form.value.bank_account_number || '',
      box_1099: form.value.box_1099 || 'Not Applicable',
    };

          if (editingAccount.value !== null) {
        // Update existing account
        await chartStore.updateAccount(
          corpStore.selectedCorporation.uuid,
          editingAccount.value,
          payload
        );
      
      // Show success toast for update
      toast.add({
        title: 'Account updated successfully!',
        icon: 'i-heroicons-check-circle',
  
      });
    } else {
      // Add new account
      await chartStore.addAccount(
        corpStore.selectedCorporation.uuid,
        payload
      );
      
      // Show success toast for add
      toast.add({
        title: 'Account added successfully!',
        icon: 'i-heroicons-check-circle',
  
      });
    }

    // Close modal - data is already updated in store
    closeModal();
  } catch (error) {
    // Show error toast
    const action = editingAccount.value !== null ? 'updating' : 'adding';
    toast.add({
      title: `Failed to ${action} account`,
      description: error instanceof Error ? error.message : `An error occurred while ${action}`,
      icon: 'i-heroicons-exclamation-triangle',

    });
  }
}

function editAccount(account: any) {
  editingAccount.value = account.id;
  form.value = {
    code: account.code,
    account_name: account.account_name,
    account_type: account.account_type,
    parent_account: account.parent_account || '',
    sub_category: account.sub_category || '',
    notes: account.notes || '',
    opening_balance: account.opening_balance || 0,
    is_header: account.is_header || false,
    bank_account_number: account.bank_account_number || '',
    box_1099: account.box_1099 || 'Not Applicable',
  };
  showModal.value = true;
}

async function deleteAccount(id: number) {
  // Find the account to show in the modal
  const account = chartStore.accounts.find(acc => acc.id === id);
  if (account) {
    accountToDelete.value = account;
    showDeleteModal.value = true;
  }
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  accountToDelete.value = null;
  deleting.value = false;
}

async function confirmDelete() {
  if (!accountToDelete.value || !corpStore.selectedCorporation) {
    toast.add({
      title: 'Error',
      description: 'No account selected for deletion',
      icon: 'i-heroicons-exclamation-triangle',

    });
    return;
  }

  deleting.value = true;

  try {
    await chartStore.deleteAccount(
      corpStore.selectedCorporation.uuid,
      accountToDelete.value.id
    );
    
    // Show success toast
    toast.add({
      title: 'Account deleted successfully!',
      icon: 'i-heroicons-check-circle',

    });
    
    // Close modal - data is already updated in store
    closeDeleteModal();
  } catch (error) {
    console.error('Delete error:', error);
    
    // Show error toast
    toast.add({
      title: 'Failed to delete account',
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
    await chartStore.deleteAllAccounts(corpStore.selectedCorporation.uuid);
    
    // Show success toast
    toast.add({
      title: 'All accounts deleted successfully!',
      icon: 'i-heroicons-check-circle',

    });
    
    // Close modal - data is already updated in store
    showDeleteAllModal.value = false;
  } catch (error) {
    // Show error toast
    toast.add({
      title: 'Failed to delete all accounts',
      description: error instanceof Error ? error.message : 'An error occurred while deleting all accounts',
      icon: 'i-heroicons-exclamation-triangle',

    });
  } finally {
    deletingAll.value = false;
  }
}

async function confirmImportDefault() {
  if (!corpStore.selectedCorporation) {
    toast.add({
      title: 'Error',
      description: 'No corporation selected',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  importingDefault.value = true;

  try {
    const result = await chartStore.importDefaultAccounts(corpStore.selectedCorporation.uuid);
    
    toast.add({
      title: 'Default Accounts Imported Successfully!',
      description: result.message,
      icon: 'i-heroicons-check-circle',
    });
    
    // Close modal
    showImportDefaultModal.value = false;
  } catch (error) {
    toast.add({
      title: 'Failed to Import Default Accounts',
      description: error instanceof Error ? error.message : 'An error occurred while importing default accounts',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    importingDefault.value = false;
  }
}

// CSV Import Functions
function triggerFileInput() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

function downloadSampleCSV() {
  // Convert to CSV string
  const csvContent = sampleChartOfAccountsData.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'sample_chart_of_accounts.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function closeImportModal() {
  showImportModal.value = false;
  resetImport();
  
  // Show "Import Cancelled" message when user manually cancels
  toast.add({
    title: 'Import Cancelled',
    description: 'CSV import has been cancelled',
    icon: 'i-heroicons-information-circle',

  });
}

function closeImportModalAfterSuccess() {
  showImportModal.value = false;
  resetImport();
  // Don't show "Import Cancelled" message for successful imports
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
  
  // Check file extension
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
        
        // Show success toast for successful parsing
        if (validatedData.errors.length === 0) {
          toast.add({
            title: 'CSV Parsed Successfully',
            description: `${validatedData.data.length} accounts ready for import`,
            icon: 'i-heroicons-check-circle',
      
          });
        } else {
          toast.add({
            title: 'CSV Parsed with Warnings',
            description: `${validatedData.data.length} accounts ready, ${validatedData.errors.length} validation errors`,
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

function validateAndTransformCSV(data: any[]) {
  const errors: string[] = [];
  const validData: any[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index starts at 0 and we have header
    
    // Check required fields - handle multiple possible column names
    const code = row['Code'] || row['Account Code'] || row['code'];
    const accountName = row['Account Name'] || row['account_name'];
    
    // In the CSV structure:
    // - Category column = Parent Account (can be empty)
    // - Account Type column or Sub-Category column = Account Type (Asset, Liability, Equity, Revenue, Expense)
    const parentAccount = row['Category'] || row['Parent Account'] || row['parent_account'] || '';
    const accountType = row['Account Type'] || row['account_type'] || '';
    
    if (!code || !accountName) {
      const errorMsg = `Row ${rowNumber}: Missing required fields (Code, Account Name). Found: Code=${code}, Account Name=${accountName}`;
      errors.push(errorMsg);
      return;
    }
    
    // If account type is not provided, skip this row
    if (!accountType || accountType.toString().trim() === '') {
      const errorMsg = `Row ${rowNumber}: Account Type is required. Skipping row.`;
      errors.push(errorMsg);
      return;
    }
    
    // Validate the account type
    const validAccountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
    const trimmedAccountType = accountType.toString().trim();
    if (!validAccountTypes.includes(trimmedAccountType)) {
      const errorMsg = `Row ${rowNumber}: Account Type "${accountType}" is not valid. Must be one of: ${validAccountTypes.join(', ')}`;
      errors.push(errorMsg);
      return;
    }
    
    // Parse opening balance - handle multiple possible column names (OPTIONAL - defaults to 0)
    const openingBalanceStr = row['Opening Balance'] || row['opening_balance'] || row['Opening_Balance'] || '0';
    let openingBalance = 0;
    
    // Only validate if a value is provided
    if (openingBalanceStr && openingBalanceStr.toString().trim() !== '') {
      let balanceStr = openingBalanceStr.toString().trim();
      
      // Check if the number is wrapped in parentheses (accounting notation for negative numbers)
      const isNegative = balanceStr.startsWith('(') && balanceStr.endsWith(')');
      
      if (isNegative) {
        // Remove parentheses
        balanceStr = balanceStr.substring(1, balanceStr.length - 1);
      }
      
      // Remove commas from the number string (e.g., "1,000.00" -> "1000.00")
      const cleanedBalance = balanceStr.replace(/,/g, '');
      openingBalance = parseFloat(cleanedBalance);
      
      if (isNaN(openingBalance)) {
        const errorMsg = `Row ${rowNumber}: Invalid opening balance "${openingBalanceStr}". Must be a valid number.`;
        errors.push(errorMsg);
        return;
      }
      
      // Apply negative sign if the number was in parentheses
      if (isNegative) {
        openingBalance = -Math.abs(openingBalance);
      }
    }
    
    // Check for duplicate codes
    const existingCode = validData.find(item => item.code === code);
    if (existingCode) {
      const errorMsg = `Row ${rowNumber}: Duplicate code "${code}" found`;
      errors.push(errorMsg);
      return;
    }
    
    // Transform to our data structure - handle multiple possible column names
    // Description/notes are OPTIONAL fields
    const notes = row['Notes'] || row['Description'] || row['notes'] || row['description'] || '';
    
    // Bank account number and 1099 box are OPTIONAL fields
    const bankAccountNumber = row['Bank Account Number'] || row['bank_account_number'] || row['Bank_Account_Number'] || '';
    const box1099 = row['1099 Box'] || row['box_1099'] || row['Box_1099'] || row['1099_Box'] || 'Not Applicable';
    
    // Get sub-category for additional categorization if needed
    const subCategory = row['Sub-Category'] || row['sub_category'] || '';
    
    // Determine if this is a header account (has children) - if parent_account is empty, might be a header
    const isHeader = !parentAccount || parentAccount.toString().trim() === '';
    
    const transformedAccount = {
      code: code.toString().trim(),
      account_name: accountName.toString().trim(),
      account_type: trimmedAccountType,
      parent_account: parentAccount ? parentAccount.toString().trim() : '',
      sub_category: subCategory ? subCategory.toString().trim() : '',
      notes: notes ? notes.toString().trim() : '',
      opening_balance: openingBalance,
      is_header: isHeader,
      bank_account_number: bankAccountNumber ? bankAccountNumber.toString().trim() : '',
      box_1099: box1099 ? box1099.toString().trim() : 'Not Applicable'
    };
    
    validData.push(transformedAccount);
  });
  
  return { data: validData, errors };
}

function getImportSuccessMessage(result: any) {
  if (!result) return '';
  
  let message = `Import completed!\n\n`;
  message += `• New accounts added: ${result.new}\n`;
  message += `• Duplicate accounts skipped: ${result.duplicates}\n`;
  message += `• Total processed: ${result.total}`;
  
  if (result.duplicates > 0) {
    message += `\n\nNote: Duplicate account codes were skipped to avoid conflicts.`;
  }
  
  // Add specific message for when all accounts are duplicates
  if (result.new === 0 && result.duplicates > 0) {
    message = `Import completed!\n\n`;
    message += `• All ${result.total} accounts already exist in the database\n`;
    message += `• No new accounts were added\n`;
    message += `• Duplicate account codes were skipped to avoid conflicts`;
  }
  
  // Add custom message if provided by API
  if (result.message) {
    message = result.message;
  }
  
  return message;
}

async function confirmImport() {
  if (!corpStore.selectedCorporation || csvData.value.length === 0) return;
  
  importing.value = true;
  
  try {
    // Prepare accounts for bulk import
    const accountsToImport = csvData.value.map(account => ({
      corporation_uuid: corpStore.selectedCorporation.uuid,
      code: account.code,
      account_name: account.account_name,
      category: account.category,
      account_type: account.account_type,
      parent_account: account.parent_account,
      sub_category: account.sub_category || '',
      notes: account.notes,
      opening_balance: account.opening_balance || 0,
      is_header: account.is_header || false,
      bank_account_number: account.bank_account_number || '',
      box_1099: account.box_1099 || 'Not Applicable'
    }));
    
    // Use bulk import
    const result = await chartStore.bulkImportAccounts(
      corpStore.selectedCorporation.uuid,
      accountsToImport
    );
    
    if (result) {
      // Force refresh the accounts list (bypass cache)
      await chartStore.fetchAccounts(corpStore.selectedCorporation.uuid, true);
      
      // Use nextTick instead of setTimeout for better performance
      await nextTick();
      
      // Double-check if we need to refresh again
      if (chartStore.accounts.length === 0) {
        await chartStore.fetchAccounts(corpStore.selectedCorporation.uuid, true);
      }
      
      // Show success toast
      toast.add({
        title: 'Import Successful',
        description: getImportSuccessMessage(result),
  
        icon: 'i-heroicons-check-circle'
      });
      
      // Close modal without showing "Import Cancelled" message
      closeImportModalAfterSuccess();
    } else {
      throw new Error('Bulk import failed - no result returned');
    }
    
  } catch (error) {
    console.error('Import error:', error);
    
    toast.add({
      title: 'Import Failed',
      description: error instanceof Error ? error.message : 'Error importing accounts. Please try again.',

      icon: 'i-heroicons-exclamation-triangle'
    });
  } finally {
    importing.value = false;
  }
}


</script>
