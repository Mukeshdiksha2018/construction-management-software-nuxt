<template>
  <div class="corporations">
    <div class="flex justify-end items-center mb-4">
      <div class="mr-1">
        <UInput
          v-model="globalFilter"
          placeholder="Search corporations..."
          icon="i-heroicons-magnifying-glass"
          variant="subtle"
          size="xs"
        />
      </div>
        <UButton
          icon="material-symbols:add-rounded"
          size="xs"
          color="primary"
          variant="solid"
          @click="showModal = true"
        >
          Add Corporation
        </UButton>
    </div>

    <div v-if="corpStore.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-8 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-8 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100">
              <div class="flex items-center">
                <USkeleton class="h-4 w-28" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
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
              <div class="flex items-center justify-end gap-1">
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="corpStore.errorMessage">
      <p class="text-red-500">Error: {{ corpStore.errorMessage }}</p>
    </div>

    <div v-else-if="corpStore.corporations.length">
      <UTable
        ref="table"
        sticky 
        v-model:pagination="pagination"
        :pagination-options="paginationOptions"
        :data="filteredCorporations" 
        :columns="columns" 
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination - only show if more than 10 records -->
      <div v-if="shouldShowPagination(filteredCorporations.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
          {{ getPageInfo(table, 'corporations').value }}
        </div>
      </div>
    </div>

    <p v-else>No corporations found.</p>
    <UModal
      v-model:open="showModal"
      title="Add Corporation"
      description="Create a new corporation for your property management system."
      :ui="{ 
        footer: 'justify-end',
        width: 'max-w-4xl'
      }"
    >
      <template #body>
        <div class="grid grid-cols-2 gap-x-6 gap-y-4">
          <div class="flex flex-col">
            <label
              for="corporation-name"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Corporation Name
            </label>
            <UInput
              id="corporation-name"
              v-model="corporationName"
              variant="subtle"
              placeholder="Corporation Name"
            />
          </div>
          
          <div class="flex flex-col">
            <label
              for="legal-name"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Legal Name
            </label>
            <UInput
              id="legal-name"
              v-model="legalName"
              variant="subtle"
              placeholder="Legal Name"
            />
          </div>
          
          <div class="flex flex-col">
            <label
              for="corporation-location"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Corporation Location
            </label>
            <UInput
              id="corporation-location"
              v-model="corporationLocation"
              variant="subtle"
              placeholder="Corporation Location"
            />
          </div>
          
          <div class="flex flex-col">
            <label
              for="no-of-rooms"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Number of Rooms
            </label>
            <UInput
              id="no-of-rooms"
              v-model="numberOfRooms"
              variant="subtle"
              type="number"
              placeholder="No of Rooms"
            />
          </div>
          
          <div class="flex flex-col">
            <label
              for="pms-type"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Select PMS Type
            </label>
            <USelect
              id="pms-type"
              v-model="pmsType"
              variant="subtle"
              :items="[
                { label: 'Opera', value: 'opera' },
                { label: 'Fosse', value: 'fosse' },
              ]"
              placeholder="Select PMS Type"
              icon="i-heroicons-building-office-2"
            />
          </div>
          
          <div class="flex flex-col">
            <label
              for="country"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Country
            </label>
            <USelect
              id="country"
              v-model="country"
              variant="subtle"
              :items="countryOptions"
              placeholder="Select Country"
              icon="i-heroicons-flag"
              searchable
            />
          </div>
          
          <div v-if="country" class="col-span-2 flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center space-x-2">
              <img 
                :src="`https://flagcdn.com/w20/${country.toLowerCase()}.png`" 
                :alt="countries.find(c => c.code === country)?.name"
                class="w-6 h-4 object-cover rounded-sm"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ countries.find(c => c.code === country)?.name }}
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-lg font-bold text-gray-800 dark:text-gray-200">{{ currencySymbol }}</span>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ currency }}</span>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
          @click="showModal = false"
        />
        <UButton label="Save" @click="saveCorporation" color="primary" />
      </template>
    </UModal>
    <UModal
      v-model:open="showEditModal"
      title="Edit Corporation"
      description="Update corporation details and settings."
      :ui="{ 
        footer: 'justify-end',
        width: 'max-w-4xl'
      }"
    >
      <template #body>
        <div class="grid grid-cols-2 gap-x-6 gap-y-4">
          <div class="flex flex-col">
            <label
              for="edit-corporation-name"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Corporation Name
            </label>
            <UInput
              id="edit-corporation-name"
              v-model="corporationName"
              variant="subtle"
              placeholder="Corporation Name"
            />
          </div>
          
          <div class="flex flex-col">
            <label
              for="edit-legal-name"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Legal Name
            </label>
            <UInput
              id="edit-legal-name"
              v-model="legalName"
              variant="subtle"
              placeholder="Legal Name"
            />
          </div>
          
          <div class="flex flex-col">
            <label
              for="edit-corporation-location"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Corporation Location
            </label>
            <UInput
              id="edit-corporation-location"
              v-model="corporationLocation"
              variant="subtle"
              placeholder="Corporation Location"
            />
          </div>
          
          <div class="flex flex-col">
            <label
              for="edit-no-of-rooms"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Number of Rooms
            </label>
            <UInput
              id="edit-no-of-rooms"
              v-model="numberOfRooms"
              variant="subtle"
              type="number"
              placeholder="No of Rooms"
            />
          </div>
          
          <div class="flex flex-col">
            <label
              for="edit-pms-type"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Select PMS Type
            </label>
            <USelect
              id="edit-pms-type"
              v-model="pmsType"
              variant="subtle"
              :items="[
                { label: 'Opera', value: 'opera' },
                { label: 'Fosse', value: 'fosse' },
              ]"
              placeholder="Select PMS Type"
              icon="i-heroicons-building-office-2"
            />
          </div>
          
          <div class="flex flex-col">
            <label
              for="country-edit"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Country
            </label>
            <USelect
              id="country-edit"
              v-model="country"
              variant="subtle"
              :items="countryOptions"
              placeholder="Select Country"
              icon="i-heroicons-flag"
              searchable
            />
          </div>
          
          <div v-if="country" class="col-span-2 flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center space-x-2">
              <img 
                :src="`https://flagcdn.com/w20/${country.toLowerCase()}.png`" 
                :alt="countries.find(c => c.code === country)?.name"
                class="w-6 h-4 object-cover rounded-sm"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ countries.find(c => c.code === country)?.name }}
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-lg font-bold text-gray-800 dark:text-gray-200">{{ currencySymbol }}</span>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ currency }}</span>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
          @click="showEditModal = false"
        />
        <UButton label="Update" @click="handleUpdate" color="primary" />
      </template>
    </UModal>
    <UModal
      v-model:open="showConfirm"
      title="Delete Corporation"
      description="This action cannot be undone. The corporation and all its data will be permanently removed."
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p>Are you sure you want to Delete?</p>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
          @click="showModal = false"
        />
        <UButton
          icon="ic:baseline-delete"
          label="Delete"
          @click="handleDelete"
          color="error"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, h, resolveComponent, ref, computed, watch } from "vue";
import { useCorporationStore } from "@/stores/corporations";
import { useAuthStore } from "@/stores/auth";
import { useUserProfilesStore } from "@/stores/userProfiles";
import { useTableStandard, createSortableColumn, createActionColumn } from '@/composables/useTableStandard'
import type { TableColumn } from '@nuxt/ui'

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

type Corporation = {
  id: string
  uuid: string
  corporation_name: string
  legal_name: string
  corporation_location: string
  number_of_rooms: number
  pms_name: string
  country: string
  currency: string
  currency_symbol: string
}

const corpStore = useCorporationStore();
const authStore = useAuthStore();
const userProfilesStore = useUserProfilesStore();
const showModal = ref(false);
const showEditModal = ref(false);
const showConfirm = ref(false);
const globalFilter = ref('');
const corporationName = ref("");
const legalName = ref("");
const corporationLocation = ref("");
const numberOfRooms = ref<number | null>(null);
const pmsType = ref("");
const country = ref("");
const currency = ref("");
const currencySymbol = ref("");
const reqUuid = ref("");
const toast = useToast();

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

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
  { code: 'GH', name: 'Ghana', currency: 'GHS', symbol: '₵' },
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
  { code: 'GF', name: 'French Guiana', currency: 'EUR', symbol: '€' },
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

// Function to get currency symbol from country code
const getCurrencyFromCountry = (countryCode: string) => {
  const country = countries.find(c => c.code === countryCode);
  return country ? { currency: country.currency, symbol: country.symbol } : null;
};

// Watch for country changes to update currency
watch(country, (newCountry) => {
  if (newCountry) {
    const currencyData = getCurrencyFromCountry(newCountry);
    if (currencyData) {
      currency.value = currencyData.currency;
      currencySymbol.value = currencyData.symbol;
    }
  }
});

// Loading data for skeleton state
const loadingData = ref<Corporation[]>([
  {
    id: '1',
    uuid: '1',
    corporation_name: '',
    legal_name: '',
    corporation_location: '',
    number_of_rooms: 0,
    pms_name: '',
    country: '',
    currency: '',
    currency_symbol: ''
  },
  {
    id: '2',
    uuid: '2',
    corporation_name: '',
    legal_name: '',
    corporation_location: '',
    number_of_rooms: 0,
    pms_name: '',
    country: '',
    currency: '',
    currency_symbol: ''
  },
  {
    id: '3',
    uuid: '3',
    corporation_name: '',
    legal_name: '',
    corporation_location: '',
    number_of_rooms: 0,
    pms_name: '',
    country: '',
    currency: '',
    currency_symbol: ''
  },
  {
    id: '4',
    uuid: '4',
    corporation_name: '',
    legal_name: '',
    corporation_location: '',
    number_of_rooms: 0,
    pms_name: '',
    country: '',
    currency: '',
    currency_symbol: ''
  },
  {
    id: '5',
    uuid: '5',
    corporation_name: '',
    legal_name: '',
    corporation_location: '',
    number_of_rooms: 0,
    pms_name: '',
    country: '',
    currency: '',
    currency_symbol: ''
  }
])

// Computed property for filtered corporations based on global filter
const filteredCorporations = computed(() => {
  if (!globalFilter.value.trim()) {
    return corpStore.corporations;
  }

  const searchTerm = globalFilter.value.toLowerCase().trim();
  
  return corpStore.corporations.filter(corp => {
    // Search across all relevant fields
    const searchableFields = [
      corp.corporation_name || '',
      corp.legal_name || '',
      corp.corporation_location || '',
      corp.number_of_rooms?.toString() || '',
      corp.pms_name || '',
      corp.country || '',
      corp.currency || '',
      corp.currency_symbol || ''
    ];

    // Check if any field contains the search term
    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

// Table columns configuration
const columns: TableColumn<Corporation>[] = [
  {
    accessorKey: 'corporation_name',
    header: 'Corporation Name',
    enableSorting: false,
    cell: ({ row }) => h('div', { class: 'font-medium text-default' }, row.original.corporation_name)
  },
  {
    accessorKey: 'legal_name',
    header: 'Legal Name',
    enableSorting: false,
    cell: ({ row }) => h('div', { class: 'text-default' }, row.original.legal_name)
  },
  {
    accessorKey: 'corporation_location',
    header: 'Location',
    enableSorting: false,
    cell: ({ row }) => h('div', { class: 'text-default' }, row.original.corporation_location)
  },
  {
    accessorKey: 'number_of_rooms',
    header: 'Rooms',
    enableSorting: false,
    cell: ({ row }) => h('div', { class: 'text-center font-medium text-default' }, row.original.number_of_rooms?.toString() || '0')
  },
  {
    accessorKey: 'pms_name',
    header: 'PMS',
    enableSorting: false,
    cell: ({ row }) => {
      const pmsColors: Record<string, string> = {
        'opera': 'bg-info/10 text-info',
        'fosse': 'bg-success/10 text-success'
      };
      const colorClass = pmsColors[row.original.pms_name?.toLowerCase()] || 'bg-elevated text-default';
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${colorClass}` 
      }, row.original.pms_name)
    }
  },
  {
    accessorKey: 'country',
    header: 'Country',
    enableSorting: false,
    cell: ({ row }) => {
      const countryData = countries.find(c => c.code === row.original.country);
      return h('div', { class: 'flex items-center space-x-2' }, [
        countryData ? h('img', {
          src: `https://flagcdn.com/w20/${row.original.country?.toLowerCase()}.png`,
          alt: countryData.name,
          class: 'w-5 h-3 object-cover rounded-sm'
        }) : null,
        h('span', { class: 'text-default' }, countryData?.name || row.original.country)
      ]);
    }
  },
  {
    accessorKey: 'currency',
    header: 'Currency',
    enableSorting: false,
    cell: ({ row }) => {
      const currencySymbol = row.original.currency_symbol || '';
      const currencyCode = row.original.currency || '';
      
      return h('div', { class: 'flex items-center space-x-1' }, [
        h('span', { class: 'text-lg font-medium text-default' }, currencySymbol),
        h('span', { class: 'text-sm text-muted' }, currencyCode)
      ]);
    }
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
          onClick: () => editCorporation(row.original)
        }, () => ''),
        h(UButton, {
          icon: 'mingcute:delete-fill',
          size: 'xs',
          variant: 'soft',
          color: 'error',
          class: 'hover:scale-105 transition-transform',
          onClick: () => handleConfirm(row.original.uuid)
        }, () => '')
      ])
    }
  }
];

onMounted(() => {
  if (!corpStore.corporations) {
    corpStore.fetchCorporations();
  }
});

const saveCorporation = async () => {
  if (
    !corporationName.value ||
    !legalName.value ||
    !numberOfRooms.value ||
    !pmsType.value ||
    !corporationLocation.value ||
    !country.value ||
    !currency.value
  ) {
    toast.add({
      title: 'Validation Error',
      description: 'Please fill all required fields',
      icon: 'i-heroicons-exclamation-triangle',

    });
    return;
  }

  try {
    const newCorporation = {
      corporation_name: corporationName.value,
      legal_name: legalName.value,
      corporation_location: corporationLocation.value,
      number_of_rooms: numberOfRooms.value,
      pms_name: pmsType.value,
      country: country.value,
      currency: currency.value,
      currency_symbol: currencySymbol.value,
    };

    const response = await corpStore.addCorporation(newCorporation);
    
    // Get the newly created corporation UUID
    const newCorporationUuid = response?.data?.uuid;
    
    // Automatically grant the current user access to the newly created corporation
    if (newCorporationUuid && authStore.user?.email) {
      try {
        // Find the current user in the userProfiles store
        const currentUser = userProfilesStore.users.find(
          (user) => user.email === authStore.user.email
        );
        
        if (currentUser) {
          // Get existing corporation access or initialize empty array
          const existingAccess = currentUser.corporationAccess || [];
          
          // Add the new corporation UUID if not already present
          if (!existingAccess.includes(newCorporationUuid)) {
            const updatedAccess = [...existingAccess, newCorporationUuid];
            
            // Update the user's corporation access
            const result = await userProfilesStore.updateUser({
              userId: currentUser.id,
              email: currentUser.email,
              firstName: currentUser.firstName,
              lastName: currentUser.lastName,
              phone: currentUser.phone,
              address: currentUser.address,
              roleId: currentUser.roleId,
              status: currentUser.status,
              imageUrl: currentUser.imageUrl,
              recentProperty: currentUser.recentProperty,
              corporationAccess: updatedAccess,
            });
            
            // Update the local store immediately for reactivity
            // (updateUser already calls fetchUsers, but this ensures immediate update)
            if (result && result.data) {
              const userIndex = userProfilesStore.users.findIndex(
                (user) => user.id === currentUser.id
              );
              if (userIndex !== -1) {
                userProfilesStore.users[userIndex] = {
                  ...userProfilesStore.users[userIndex],
                  ...result.data,
                };
              }
            }
          }
        }
      } catch (accessError) {
        // Log error but don't fail the corporation creation
        console.error('Error granting user access to corporation:', accessError);
      }
    }
    
    // Show success toast
    toast.add({
      title: 'Corporation added successfully!',
      icon: 'i-heroicons-check-circle',

    });

    // Reset form and close modal
    showModal.value = false;
    corporationName.value = "";
    legalName.value = "";
    corporationLocation.value = "";
    numberOfRooms.value = null;
    pmsType.value = "";
    country.value = "";
    currency.value = "";
    currencySymbol.value = "";
  } catch (error) {
    // Show error toast
    toast.add({
      title: 'Failed to add corporation',
      description: error instanceof Error ? error.message : 'An error occurred while adding',
      icon: 'i-heroicons-exclamation-triangle',

    });
  }
};

function editCorporation(corp: any) {
  corporationName.value = corp.corporation_name;
  legalName.value = corp.legal_name;
  numberOfRooms.value = corp.number_of_rooms;
  corporationLocation.value = corp.corporation_location;
  pmsType.value = corp.pms_name;
  country.value = corp.country || "";
  currency.value = corp.currency || "";
  currencySymbol.value = corp.currency_symbol || "";
  reqUuid.value = corp.uuid;
  showEditModal.value = true;
}

const handleUpdate = async () => {
  try {
    await corpStore.updateCorporation(reqUuid.value, {
      corporation_name: corporationName.value,
      legal_name: legalName.value,
      corporation_location: corporationLocation.value,
      number_of_rooms: numberOfRooms.value,
      pms_name: pmsType.value,
      country: country.value,
      currency: currency.value,
      currency_symbol: currencySymbol.value,
    });
    
    // Show success toast
    toast.add({
      title: 'Corporation updated successfully!',
      icon: 'i-heroicons-check-circle',

    });
    
    // Reset form and close modal
    corporationName.value = "";
    legalName.value = "";
    corporationLocation.value = "";
    numberOfRooms.value = null;
    pmsType.value = "";
    country.value = "";
    currency.value = "";
    currencySymbol.value = "";
    showEditModal.value = false;
  } catch (error) {
    // Show error toast
    toast.add({
      title: 'Failed to update corporation',
      description: error instanceof Error ? error.message : 'An error occurred while updating',
      icon: 'i-heroicons-exclamation-triangle',

    });
  }
};

async function handleDelete() {
  try {
    await corpStore.deleteCorporation(reqUuid.value);
    
    // Show success toast
    toast.add({
      title: 'Corporation deleted successfully!',
      icon: 'i-heroicons-check-circle',

    });
    
    // Close modal and reset
    showConfirm.value = false;
    reqUuid.value = "";
  } catch (error) {
    // Show error toast
    toast.add({
      title: 'Failed to delete corporation',
      description: error instanceof Error ? error.message : 'An error occurred while deleting',
      icon: 'i-heroicons-exclamation-triangle',

    });
  }
}

function handleConfirm(uuid: string) {
  showConfirm.value = true;
  reqUuid.value = uuid;
}

</script>
