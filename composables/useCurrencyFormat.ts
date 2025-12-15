import { computed } from 'vue'
import { useCorporationStore } from '@/stores/corporations'

export const useCurrencyFormat = () => {
  const corpStore = useCorporationStore()

  // Get the selected corporation's currency settings
  const selectedCorporation = computed(() => corpStore.selectedCorporation)
  
  const currencyCode = computed(() => selectedCorporation.value?.currency || 'USD')
  const currencySymbol = computed(() => selectedCorporation.value?.currency_symbol || '$')
  const countryCode = computed(() => selectedCorporation.value?.country || 'US')

  // Format currency using Intl.NumberFormat with the corporation's currency
  const formatCurrency = (amount: number | string | null | undefined, options?: Intl.NumberFormatOptions) => {
    if (amount === null || amount === undefined || amount === '') return '0'
    
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numericAmount)) return '0'

    try {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode.value,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options
      })
      return formatter.format(numericAmount)
    } catch (error) {
      // Fallback to simple formatting with currency symbol
      return `${currencySymbol.value}${numericAmount.toFixed(2)}`
    }
  }

  // Format currency with custom symbol (useful for display purposes)
  const formatCurrencyWithSymbol = (amount: number | string | null | undefined, options?: Intl.NumberFormatOptions) => {
    if (amount === null || amount === undefined || amount === '') return `${currencySymbol.value}0.00`
    
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numericAmount)) return `${currencySymbol.value}0.00`

    try {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode.value,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options
      })
      return formatter.format(numericAmount)
    } catch (error) {
      // Fallback to simple formatting with currency symbol
      return `${currencySymbol.value}${numericAmount.toFixed(2)}`
    }
  }

  // Format number with thousands separators (without currency symbol)
  const formatNumber = (amount: number | string | null | undefined, options?: Intl.NumberFormatOptions) => {
    if (amount === null || amount === undefined || amount === '') return '0'
    
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numericAmount)) return '0'

    try {
      const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options
      })
      return formatter.format(numericAmount)
    } catch (error) {
      return numericAmount.toFixed(2)
    }
  }

  // Format currency with abbreviations (1k, 1.5k, 1M, etc. or 1L, 1.5L, 1Cr for INR)
  const formatCurrencyAbbreviated = (amount: number | string | null | undefined, options?: { minAbbreviation?: number }) => {
    if (amount === null || amount === undefined || amount === '') return `${currencySymbol.value}0`
    
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numericAmount)) return `${currencySymbol.value}0`

    const isINR = currencyCode.value === 'INR'
    const minAbbreviation = options?.minAbbreviation ?? (isINR ? 100000 : 1000)
    const absAmount = Math.abs(numericAmount)
    const sign = numericAmount < 0 ? '-' : ''

    // Only abbreviate if the number is >= minAbbreviation
    if (absAmount < minAbbreviation) {
      // Use regular formatting for smaller numbers
      try {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currencyCode.value,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
        return formatter.format(numericAmount)
      } catch (error) {
        return `${sign}${currencySymbol.value}${absAmount.toFixed(2)}`
      }
    }

    // Determine the appropriate abbreviation based on currency
    let divisor: number
    let suffix: string

    if (isINR) {
      // Indian numbering system: Lakhs (1,00,000) and Crores (1,00,00,000)
      if (absAmount >= 1_00_00_000) {
        // Crores
        divisor = 1_00_00_000
        suffix = 'Cr'
      } else {
        // Lakhs
        divisor = 1_00_000
        suffix = 'L'
      }
    } else {
      // Western numbering system: k (thousands), M (millions), B (billions)
      if (absAmount >= 1_000_000_000) {
        divisor = 1_000_000_000
        suffix = 'B'
      } else if (absAmount >= 1_000_000) {
        divisor = 1_000_000
        suffix = 'M'
      } else {
        divisor = 1_000
        suffix = 'k'
      }
    }

    const abbreviatedValue = absAmount / divisor
    
    // Format with 1-2 decimal places, but remove trailing zeros
    let formattedValue: string
    if (abbreviatedValue % 1 === 0) {
      // Whole number, no decimals
      formattedValue = abbreviatedValue.toString()
    } else if (abbreviatedValue < 10) {
      // For values < 10, show 1 decimal place
      formattedValue = abbreviatedValue.toFixed(1)
    } else {
      // For values >= 10, show whole number
      formattedValue = Math.round(abbreviatedValue).toString()
    }

    // Remove trailing zeros after decimal point
    formattedValue = formattedValue.replace(/\.0+$/, '')

    return `${sign}${currencySymbol.value}${formattedValue}${suffix}`
  }

  // Format number with abbreviations (without currency symbol)
  // Uses Indian numbering (Lakhs/Crores) for INR, Western (k/M/B) for others
  const formatNumberAbbreviated = (amount: number | string | null | undefined, options?: { minAbbreviation?: number }) => {
    if (amount === null || amount === undefined || amount === '') return '0'
    
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numericAmount)) return '0'

    const isINR = currencyCode.value === 'INR'
    const minAbbreviation = options?.minAbbreviation ?? (isINR ? 100000 : 1000)
    const absAmount = Math.abs(numericAmount)
    const sign = numericAmount < 0 ? '-' : ''

    // Only abbreviate if the number is >= minAbbreviation
    if (absAmount < minAbbreviation) {
      // Use regular formatting for smaller numbers
      try {
        const formatter = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
        return formatter.format(numericAmount)
      } catch (error) {
        return `${sign}${absAmount.toFixed(2)}`
      }
    }

    // Determine the appropriate abbreviation based on currency
    let divisor: number
    let suffix: string

    if (isINR) {
      // Indian numbering system: Lakhs (1,00,000) and Crores (1,00,00,000)
      if (absAmount >= 1_00_00_000) {
        // Crores
        divisor = 1_00_00_000
        suffix = 'Cr'
      } else {
        // Lakhs
        divisor = 1_00_000
        suffix = 'L'
      }
    } else {
      // Western numbering system: k (thousands), M (millions), B (billions)
      if (absAmount >= 1_000_000_000) {
        divisor = 1_000_000_000
        suffix = 'B'
      } else if (absAmount >= 1_000_000) {
        divisor = 1_000_000
        suffix = 'M'
      } else {
        divisor = 1_000
        suffix = 'k'
      }
    }

    const abbreviatedValue = absAmount / divisor
    
    // Format with 1-2 decimal places, but remove trailing zeros
    let formattedValue: string
    if (abbreviatedValue % 1 === 0) {
      // Whole number, no decimals
      formattedValue = abbreviatedValue.toString()
    } else if (abbreviatedValue < 10) {
      // For values < 10, show 1 decimal place
      formattedValue = abbreviatedValue.toFixed(1)
    } else {
      // For values >= 10, show whole number
      formattedValue = Math.round(abbreviatedValue).toString()
    }

    // Remove trailing zeros after decimal point
    formattedValue = formattedValue.replace(/\.0+$/, '')

    return `${sign}${formattedValue}${suffix}`
  }

  // Get currency info for display
  const currencyInfo = computed(() => ({
    code: currencyCode.value,
    symbol: currencySymbol.value,
    country: countryCode.value
  }))

  return {
    currencyCode,
    currencySymbol,
    countryCode,
    formatCurrency,
    formatCurrencyWithSymbol,
    formatCurrencyAbbreviated,
    formatNumber,
    formatNumberAbbreviated,
    currencyInfo,
    selectedCorporation
  }
}
