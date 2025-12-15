import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Vue's computed and ref functions
vi.mock('vue', () => ({
  computed: (fn: () => any) => ({ value: fn() }),
}))

// Create a simple mock for the corporation store
const createMockStore = (mockData: any = {}) => ({
  selectedCorporation: mockData.selectedCorporation || {
    currency: 'USD',
    currency_symbol: '$',
    country: 'US'
  }
})

// Mock the corporation store
let mockCorporationStore = createMockStore()

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorporationStore
}))

// Import after mocks
const { useCurrencyFormat } = await import('../../../composables/useCurrencyFormat')

describe('useCurrencyFormat', () => {
  beforeEach(() => {
    // Reset to default USD settings
    mockCorporationStore = createMockStore()
  })

  describe('Currency Information', () => {
    it('should return correct default currency info', () => {
      const { currencyCode, currencySymbol, countryCode, currencyInfo } = useCurrencyFormat()
      
      expect(currencyCode.value).toBe('USD')
      expect(currencySymbol.value).toBe('$')
      expect(countryCode.value).toBe('US')
      expect(currencyInfo.value).toEqual({
        code: 'USD',
        symbol: '$',
        country: 'US'
      })
    })

    it('should handle different currency settings', () => {
      mockCorporationStore = createMockStore({
        selectedCorporation: {
          currency: 'EUR',
          currency_symbol: '€',
          country: 'DE'
        }
      })
      
      const { currencyCode, currencySymbol, countryCode } = useCurrencyFormat()
      
      expect(currencyCode.value).toBe('EUR')
      expect(currencySymbol.value).toBe('€')
      expect(countryCode.value).toBe('DE')
    })

    it('should fallback to defaults when corporation data is missing', () => {
      mockCorporationStore = createMockStore({ selectedCorporation: null })
      
      const { currencyCode, currencySymbol, countryCode } = useCurrencyFormat()
      
      expect(currencyCode.value).toBe('USD')
      expect(currencySymbol.value).toBe('$')
      expect(countryCode.value).toBe('US')
    })
  })

  describe('Number Formatting Functions', () => {
    let formatter: ReturnType<typeof useCurrencyFormat>

    beforeEach(() => {
      formatter = useCurrencyFormat()
    })

    describe('formatCurrency', () => {
      it('should format positive numbers correctly', () => {
        const result = formatter.formatCurrency(1234.56)
        expect(result).toBe('$1,234.56')
      })

      it('should format negative numbers correctly', () => {
        const result = formatter.formatCurrency(-1234.56)
        expect(result).toBe('-$1,234.56')
      })

      it('should format zero correctly', () => {
        const result = formatter.formatCurrency(0)
        expect(result).toBe('$0.00')
      })

      it('should handle string numbers', () => {
        const result = formatter.formatCurrency('1234.56')
        expect(result).toBe('$1,234.56')
      })

      it('should return "0" for null, undefined, or empty values', () => {
        expect(formatter.formatCurrency(null)).toBe('0')
        expect(formatter.formatCurrency(undefined)).toBe('0')
        expect(formatter.formatCurrency('')).toBe('0')
      })

      it('should return "0" for invalid strings', () => {
        expect(formatter.formatCurrency('invalid')).toBe('0')
        expect(formatter.formatCurrency('not-a-number')).toBe('0')
      })

      it('should handle large numbers', () => {
        const result = formatter.formatCurrency(1234567.89)
        expect(result).toBe('$1,234,567.89')
      })

      it('should handle decimal precision', () => {
        const result = formatter.formatCurrency(1234.1)
        expect(result).toBe('$1,234.10')
      })
    })

    describe('formatCurrencyWithSymbol', () => {
      it('should format with currency symbol', () => {
        const result = formatter.formatCurrencyWithSymbol(1234.56)
        expect(result).toBe('$1,234.56')
      })

      it('should return default format for null/undefined', () => {
        expect(formatter.formatCurrencyWithSymbol(null)).toBe('$0.00')
        expect(formatter.formatCurrencyWithSymbol(undefined)).toBe('$0.00')
        expect(formatter.formatCurrencyWithSymbol('')).toBe('$0.00')
      })

      it('should handle invalid numbers with symbol', () => {
        const result = formatter.formatCurrencyWithSymbol('invalid')
        expect(result).toBe('$0.00')
      })
    })

    describe('formatNumber', () => {
      it('should format numbers without currency symbol', () => {
        const result = formatter.formatNumber(1234.56)
        expect(result).toBe('1,234.56')
      })

      it('should format negative numbers without currency symbol', () => {
        const result = formatter.formatNumber(-1234.56)
        expect(result).toBe('-1,234.56')
      })

      it('should return "0" for invalid inputs', () => {
        expect(formatter.formatNumber(null)).toBe('0')
        expect(formatter.formatNumber(undefined)).toBe('0')
        expect(formatter.formatNumber('')).toBe('0')
        expect(formatter.formatNumber('invalid')).toBe('0')
      })

      it('should handle string numbers', () => {
        const result = formatter.formatNumber('9876.54')
        expect(result).toBe('9,876.54')
      })
    })
  })

  describe('Custom Options', () => {
    let formatter: ReturnType<typeof useCurrencyFormat>

    beforeEach(() => {
      formatter = useCurrencyFormat()
    })

    it('should accept custom formatting options for formatCurrency', () => {
      const result = formatter.formatCurrency(1234.567, { 
        minimumFractionDigits: 3,
        maximumFractionDigits: 3 
      })
      // Note: This test might vary based on browser/environment Intl support
      expect(typeof result).toBe('string')
      expect(result).toContain('1,234')
    })

    it('should accept custom formatting options for formatNumber', () => {
      const result = formatter.formatNumber(1234.567, { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
      })
      expect(result).toBe('1,235')
    })
  })

  describe('Different Currency Settings', () => {
    it('should work with EUR currency', () => {
      mockCorporationStore = createMockStore({
        selectedCorporation: {
          currency: 'EUR',
          currency_symbol: '€',
          country: 'DE'
        }
      })
      
      const formatter = useCurrencyFormat()
      const result = formatter.formatCurrencyWithSymbol(1234.56)
      expect(result).toBe('€1,234.56')
    })

    it('should work with GBP currency', () => {
      mockCorporationStore = createMockStore({
        selectedCorporation: {
          currency: 'GBP',
          currency_symbol: '£',
          country: 'GB'
        }
      })
      
      const formatter = useCurrencyFormat()
      const result = formatter.formatCurrencyWithSymbol(1234.56)
      expect(result).toBe('£1,234.56')
    })
  })

  describe('Edge Cases', () => {
    let formatter: ReturnType<typeof useCurrencyFormat>

    beforeEach(() => {
      formatter = useCurrencyFormat()
    })

    it('should handle very small numbers', () => {
      const result = formatter.formatCurrency(0.01)
      expect(result).toBe('$0.01')
    })

    it('should handle very large numbers', () => {
      const result = formatter.formatCurrency(999999999.99)
      expect(result).toBe('$999,999,999.99')
    })

    it('should handle numbers with many decimal places', () => {
      const result = formatter.formatCurrency(123.456789)
      expect(result).toBe('$123.46') // Should round to 2 decimal places
    })

    it('should handle exponential notation', () => {
      const result = formatter.formatCurrency(1e6)
      expect(result).toBe('$1,000,000.00')
    })
  })

  describe('Abbreviated Formatting', () => {
    let formatter: ReturnType<typeof useCurrencyFormat>

    beforeEach(() => {
      formatter = useCurrencyFormat()
    })

    describe('formatCurrencyAbbreviated', () => {
      it('should format thousands with k suffix', () => {
        expect(formatter.formatCurrencyAbbreviated(1000)).toBe('$1k')
        expect(formatter.formatCurrencyAbbreviated(1500)).toBe('$1.5k')
        expect(formatter.formatCurrencyAbbreviated(9999)).toBe('$10k')
      })

      it('should format millions with M suffix', () => {
        expect(formatter.formatCurrencyAbbreviated(1000000)).toBe('$1M')
        expect(formatter.formatCurrencyAbbreviated(1500000)).toBe('$1.5M')
        expect(formatter.formatCurrencyAbbreviated(9999999)).toBe('$10M')
      })

      it('should format billions with B suffix', () => {
        expect(formatter.formatCurrencyAbbreviated(1000000000)).toBe('$1B')
        expect(formatter.formatCurrencyAbbreviated(1500000000)).toBe('$1.5B')
      })

      it('should use regular formatting for numbers below 1000', () => {
        expect(formatter.formatCurrencyAbbreviated(999)).toContain('999')
        expect(formatter.formatCurrencyAbbreviated(500)).toContain('500')
        expect(formatter.formatCurrencyAbbreviated(0)).toBe('$0')
      })

      it('should handle negative numbers', () => {
        expect(formatter.formatCurrencyAbbreviated(-1000)).toBe('-$1k')
        expect(formatter.formatCurrencyAbbreviated(-1500)).toBe('-$1.5k')
        expect(formatter.formatCurrencyAbbreviated(-1000000)).toBe('-$1M')
      })

      it('should handle null, undefined, and empty values', () => {
        expect(formatter.formatCurrencyAbbreviated(null)).toBe('$0')
        expect(formatter.formatCurrencyAbbreviated(undefined)).toBe('$0')
        expect(formatter.formatCurrencyAbbreviated('')).toBe('$0')
      })

      it('should handle string numbers', () => {
        expect(formatter.formatCurrencyAbbreviated('1000')).toBe('$1k')
        expect(formatter.formatCurrencyAbbreviated('1500')).toBe('$1.5k')
        expect(formatter.formatCurrencyAbbreviated('1000000')).toBe('$1M')
      })

      it('should respect minAbbreviation option', () => {
        expect(formatter.formatCurrencyAbbreviated(5000, { minAbbreviation: 10000 })).toContain('5,000')
        expect(formatter.formatCurrencyAbbreviated(10000, { minAbbreviation: 10000 })).toBe('$10k')
      })

      it('should remove trailing zeros', () => {
        expect(formatter.formatCurrencyAbbreviated(2000)).toBe('$2k')
        expect(formatter.formatCurrencyAbbreviated(2000000)).toBe('$2M')
      })

      it('should round large abbreviated values correctly', () => {
        expect(formatter.formatCurrencyAbbreviated(15000)).toBe('$15k')
        expect(formatter.formatCurrencyAbbreviated(15000000)).toBe('$15M')
      })

      it('should use Indian numbering system (Lakhs/Crores) for INR currency', () => {
        // Set up INR currency
        mockCorporationStore = createMockStore({
          selectedCorporation: {
            currency: 'INR',
            currency_symbol: '₹',
            country: 'IN'
          }
        })
        
        const inrFormatter = useCurrencyFormat()
        
        // Test Lakhs (1,00,000)
        expect(inrFormatter.formatCurrencyAbbreviated(100000)).toBe('₹1L')
        expect(inrFormatter.formatCurrencyAbbreviated(150000)).toBe('₹1.5L')
        expect(inrFormatter.formatCurrencyAbbreviated(999999)).toBe('₹10L')
        
        // Test Crores (1,00,00,000)
        expect(inrFormatter.formatCurrencyAbbreviated(10000000)).toBe('₹1Cr')
        expect(inrFormatter.formatCurrencyAbbreviated(15000000)).toBe('₹1.5Cr')
        expect(inrFormatter.formatCurrencyAbbreviated(99999999)).toBe('₹10Cr')
        
        // Test values below 1 Lakh (should use regular formatting)
        expect(inrFormatter.formatCurrencyAbbreviated(99999)).toContain('99,999')
        expect(inrFormatter.formatCurrencyAbbreviated(50000)).toContain('50,000')
      })

      it('should use Western numbering system for non-INR currencies', () => {
        // Test with EUR
        mockCorporationStore = createMockStore({
          selectedCorporation: {
            currency: 'EUR',
            currency_symbol: '€',
            country: 'DE'
          }
        })
        
        const eurFormatter = useCurrencyFormat()
        expect(eurFormatter.formatCurrencyAbbreviated(1000)).toBe('€1k')
        expect(eurFormatter.formatCurrencyAbbreviated(1000000)).toBe('€1M')
        expect(eurFormatter.formatCurrencyAbbreviated(1000000000)).toBe('€1B')
      })
    })

    describe('formatNumberAbbreviated', () => {
      it('should format thousands with k suffix (no currency symbol)', () => {
        expect(formatter.formatNumberAbbreviated(1000)).toBe('1k')
        expect(formatter.formatNumberAbbreviated(1500)).toBe('1.5k')
        expect(formatter.formatNumberAbbreviated(9999)).toBe('10k')
      })

      it('should format millions with M suffix (no currency symbol)', () => {
        expect(formatter.formatNumberAbbreviated(1000000)).toBe('1M')
        expect(formatter.formatNumberAbbreviated(1500000)).toBe('1.5M')
        expect(formatter.formatNumberAbbreviated(9999999)).toBe('10M')
      })

      it('should format billions with B suffix (no currency symbol)', () => {
        expect(formatter.formatNumberAbbreviated(1000000000)).toBe('1B')
        expect(formatter.formatNumberAbbreviated(1500000000)).toBe('1.5B')
      })

      it('should use regular formatting for numbers below 1000', () => {
        expect(formatter.formatNumberAbbreviated(999)).toContain('999')
        expect(formatter.formatNumberAbbreviated(500)).toContain('500')
        expect(formatter.formatNumberAbbreviated(0)).toBe('0')
      })

      it('should handle negative numbers', () => {
        expect(formatter.formatNumberAbbreviated(-1000)).toBe('-1k')
        expect(formatter.formatNumberAbbreviated(-1500)).toBe('-1.5k')
        expect(formatter.formatNumberAbbreviated(-1000000)).toBe('-1M')
      })

      it('should handle null, undefined, and empty values', () => {
        expect(formatter.formatNumberAbbreviated(null)).toBe('0')
        expect(formatter.formatNumberAbbreviated(undefined)).toBe('0')
        expect(formatter.formatNumberAbbreviated('')).toBe('0')
      })

      it('should handle string numbers', () => {
        expect(formatter.formatNumberAbbreviated('1000')).toBe('1k')
        expect(formatter.formatNumberAbbreviated('1500')).toBe('1.5k')
        expect(formatter.formatNumberAbbreviated('1000000')).toBe('1M')
      })

      it('should respect minAbbreviation option', () => {
        expect(formatter.formatNumberAbbreviated(5000, { minAbbreviation: 10000 })).toContain('5,000')
        expect(formatter.formatNumberAbbreviated(10000, { minAbbreviation: 10000 })).toBe('10k')
      })

      it('should use Indian numbering system (Lakhs/Crores) for INR currency', () => {
        // Set up INR currency
        mockCorporationStore = createMockStore({
          selectedCorporation: {
            currency: 'INR',
            currency_symbol: '₹',
            country: 'IN'
          }
        })
        
        const inrFormatter = useCurrencyFormat()
        
        // Test Lakhs (1,00,000)
        expect(inrFormatter.formatNumberAbbreviated(100000)).toBe('1L')
        expect(inrFormatter.formatNumberAbbreviated(150000)).toBe('1.5L')
        expect(inrFormatter.formatNumberAbbreviated(999999)).toBe('10L')
        
        // Test Crores (1,00,00,000)
        expect(inrFormatter.formatNumberAbbreviated(10000000)).toBe('1Cr')
        expect(inrFormatter.formatNumberAbbreviated(15000000)).toBe('1.5Cr')
        expect(inrFormatter.formatNumberAbbreviated(99999999)).toBe('10Cr')
        
        // Test values below 1 Lakh (should use regular formatting)
        expect(inrFormatter.formatNumberAbbreviated(99999)).toContain('99,999')
        expect(inrFormatter.formatNumberAbbreviated(50000)).toContain('50,000')
      })
    })
  })
})
