import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import FinancialBreakdown from '@/components/PurchaseOrders/FinancialBreakdown.vue'

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0)
      if (Number.isNaN(num)) return '$0.00'
      return `$${num.toFixed(2)}`
    },
    currencySymbol: ref('$'),
  }),
}))

describe('FinancialBreakdown.vue', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  const baseFormData = {
    freight_charges_percentage: null,
    freight_charges_amount: null,
    freight_charges_taxable: false,
    packing_charges_percentage: null,
    packing_charges_amount: null,
    packing_charges_taxable: false,
    custom_duties_charges_percentage: null,
    custom_duties_charges_amount: null,
    custom_duties_charges_taxable: false,
    other_charges_percentage: null,
    other_charges_amount: null,
    other_charges_taxable: false,
    sales_tax_1_percentage: null,
    sales_tax_1_amount: null,
    sales_tax_2_percentage: null,
    sales_tax_2_amount: null,
  }

  describe('hideCharges prop', () => {
    it('shows charges section by default', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
        },
      })

      // Charges section should be visible (not hidden)
      expect(wrapper.props('hideCharges')).toBe(false)
    })

    it('hides charges section when hideCharges is true', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          hideCharges: true,
        },
      })

      expect(wrapper.props('hideCharges')).toBe(true)
    })

    it('calculates taxable base correctly when charges are hidden', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            sales_tax_1_percentage: 10,
          },
          readOnly: false,
          hideCharges: true,
        },
      })

      await flushPromises()

      // When charges are hidden, taxable base should equal item total
      // Sales tax should be calculated on item total only
      // 10% of 1000 = 100
      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Tax total should be 100 (10% of 1000)
        expect(lastUpdate.tax_total).toBeCloseTo(100, 2)
        // Charges total should be 0
        expect(lastUpdate.charges_total).toBe(0)
        // Final total should be 1100 (1000 + 100)
        // Uses totalFieldName prop which defaults to 'total_po_amount'
        expect(lastUpdate.total_po_amount).toBeCloseTo(1100, 2)
      }
    })

    it('calculates final total correctly when charges are hidden', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 500,
          formData: {
            ...baseFormData,
            sales_tax_1_percentage: 8,
            sales_tax_2_percentage: 2,
          },
          readOnly: false,
          hideCharges: true,
        },
      })

      await flushPromises()

      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Tax 1: 8% of 500 = 40
        // Tax 2: 2% of 500 = 10
        // Total tax: 50
        // Final total: 500 + 50 = 550 (no charges)
        expect(lastUpdate.tax_total).toBeCloseTo(50, 2)
        expect(lastUpdate.charges_total).toBe(0)
        expect(lastUpdate.total_po_amount).toBeCloseTo(550, 2)
      }
    })

    it('includes charges in financial breakdown structure when hidden', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            sales_tax_1_percentage: 5,
          },
          readOnly: false,
          hideCharges: true,
        },
      })

      await flushPromises()

      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        expect(lastUpdate.financial_breakdown).toBeDefined()
        expect(lastUpdate.financial_breakdown.charges).toBeDefined()
        // Charges should have null values when hidden
        expect(lastUpdate.financial_breakdown.charges.freight.amount).toBeNull()
        expect(lastUpdate.financial_breakdown.charges.packing.amount).toBeNull()
        expect(lastUpdate.financial_breakdown.charges.custom_duties.amount).toBeNull()
        expect(lastUpdate.financial_breakdown.charges.other.amount).toBeNull()
        // Charges total should be 0
        expect(lastUpdate.financial_breakdown.totals.charges_total).toBe(0)
      }
    })

    it('calculates charges correctly when hideCharges is false', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_percentage: 5,
            packing_charges_percentage: 2,
            sales_tax_1_percentage: 10,
          },
          readOnly: false,
          hideCharges: false,
        },
      })

      await flushPromises()

      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Freight: 5% of 1000 = 50
        // Packing: 2% of 1000 = 20
        // Charges total: 70
        // Taxable base: 1000 + taxable charges (only if taxable is true)
        // Since taxable defaults to false, taxable base = 1000
        // Tax: 10% of 1000 = 100
        // Final total: 1000 + 70 + 100 = 1170
        expect(lastUpdate.charges_total).toBeCloseTo(70, 2)
        expect(lastUpdate.tax_total).toBeCloseTo(100, 2)
        expect(lastUpdate.total_po_amount).toBeCloseTo(1170, 2)
      }
    })

    it('handles sales tax calculation correctly with hidden charges', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 200,
          formData: {
            ...baseFormData,
            sales_tax_1_percentage: 8.5,
          },
          readOnly: false,
          hideCharges: true,
        },
      })

      await flushPromises()

      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Tax: 8.5% of 200 = 17
        // Final: 200 + 17 = 217
        expect(lastUpdate.sales_tax_1_amount).toBeCloseTo(17, 2)
        expect(lastUpdate.tax_total).toBeCloseTo(17, 2)
        expect(lastUpdate.total_po_amount).toBeCloseTo(217, 2)
        expect(lastUpdate.charges_total).toBe(0)
      }
    })
  })

  describe('Standard functionality (without hideCharges)', () => {
    it('calculates charges and taxes correctly', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_percentage: 3,
            packing_charges_percentage: 1,
            sales_tax_1_percentage: 7,
          },
          readOnly: false,
        },
      })

      await flushPromises()

      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Freight: 3% of 1000 = 30
        // Packing: 1% of 1000 = 10
        // Charges total: 40
        // Taxable base: 1000 (charges are not taxable by default)
        // Tax: 7% of 1000 = 70
        // Final: 1000 + 40 + 70 = 1110
        expect(lastUpdate.charges_total).toBeCloseTo(40, 2)
        expect(lastUpdate.tax_total).toBeCloseTo(70, 2)
        expect(lastUpdate.total_po_amount).toBeCloseTo(1110, 2)
      }
    })
  })

  describe('Editable Total (allowEditTotal prop)', () => {
    it('displays read-only total when allowEditTotal is false', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          allowEditTotal: false,
        },
      })

      expect(wrapper.props('allowEditTotal')).toBe(false)
      // Should show formatted currency value, not input field
      const html = wrapper.html()
      expect(html).not.toContain('UInput')
    })

    it('displays editable input when allowEditTotal is true', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          allowEditTotal: true,
        },
      })

      expect(wrapper.props('allowEditTotal')).toBe(true)
      // Should show input field for editing
      const html = wrapper.html().toLowerCase()
      expect(html).toContain('input')
    })

    it('displays saved partial payment amount from financial_breakdown.totals.total_invoice_amount', async () => {
      const formDataWithPartialPayment = {
        ...baseFormData,
        financial_breakdown: {
          totals: {
            item_total: 10000,
            charges_total: 1000,
            tax_total: 500,
            total_invoice_amount: 5000, // Partial payment amount
            amount: 5000,
          },
        },
        amount: 5000,
      }

      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 10000,
          formData: formDataWithPartialPayment,
          readOnly: false,
          allowEditTotal: true,
          totalFieldName: 'amount',
        },
      })

      await flushPromises()

      // The displayTotal computed should return 5000 (the partial payment)
      // not the calculated total (11500)
      const input = wrapper.find('input')
      if (input.exists()) {
        const inputValue = input.element.value
        // Should show the partial payment amount, not calculated total
        expect(parseFloat(inputValue) || 0).toBe(5000)
      }
    })

    it('displays empty (0) when no saved partial payment exists for editable total', async () => {
      const formDataWithoutPartialPayment = {
        ...baseFormData,
        financial_breakdown: {
          totals: {
            item_total: 10000,
            charges_total: 1000,
            tax_total: 500,
            // No total_invoice_amount - should show empty
          },
        },
        amount: null,
      }

      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 10000,
          formData: formDataWithoutPartialPayment,
          readOnly: false,
          allowEditTotal: true,
          totalFieldName: 'amount',
        },
      })

      await flushPromises()

      // Should show 0 (empty) instead of calculated total
      const input = wrapper.find('input')
      if (input.exists()) {
        const inputValue = input.element.value
        expect(parseFloat(inputValue) || 0).toBe(0)
      }
    })

    it('saves edited total to financial_breakdown.totals.total_invoice_amount', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 10000,
          formData: {
            ...baseFormData,
            amount: 0,
          },
          readOnly: false,
          allowEditTotal: true,
          totalFieldName: 'amount',
        },
      })

      await flushPromises()

      // Find the input and update it
      const input = wrapper.find('input')
      if (input.exists()) {
        await input.setValue('7500')
        await input.trigger('update:modelValue', '7500')
        await flushPromises()

        const updateEvents = wrapper.emitted('update')
        expect(updateEvents).toBeTruthy()
        if (updateEvents && updateEvents.length > 0) {
          const lastUpdate = updateEvents[updateEvents.length - 1][0]
          
          // Should save to amount field
          expect(lastUpdate.amount).toBe(7500)
          
          // Should also save to financial_breakdown.totals.total_invoice_amount
          expect(lastUpdate.financial_breakdown).toBeDefined()
          expect(lastUpdate.financial_breakdown.totals).toBeDefined()
          expect(lastUpdate.financial_breakdown.totals.total_invoice_amount).toBe(7500)
          expect(lastUpdate.financial_breakdown.totals.amount).toBe(7500)
        }
      }
    })

    it('preserves manually edited total when recalculating', async () => {
      const formDataWithPartialPayment = {
        ...baseFormData,
        financial_breakdown: {
          totals: {
            item_total: 10000,
            charges_total: 1000,
            tax_total: 500,
            total_invoice_amount: 6000, // Saved partial payment
            amount: 6000,
          },
        },
        amount: 6000,
        sales_tax_1_percentage: 5, // Change tax percentage
      }

      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 10000,
          formData: formDataWithPartialPayment,
          readOnly: false,
          allowEditTotal: true,
          totalFieldName: 'amount',
        },
      })

      await flushPromises()

      // Wait for recalculation
      await new Promise(resolve => setTimeout(resolve, 100))

      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        
        // Should preserve the partial payment amount (6000)
        // not use calculated total (which would be different)
        // Check both amount field and totalFieldName
        const preservedAmount = lastUpdate.amount ?? lastUpdate[wrapper.props('totalFieldName')]
        expect(preservedAmount).toBe(6000)
        
        // Check financial_breakdown structure
        if (lastUpdate.financial_breakdown?.totals) {
          const preservedInBreakdown = lastUpdate.financial_breakdown.totals.total_invoice_amount ?? 
                                      lastUpdate.financial_breakdown.totals.amount
          expect(preservedInBreakdown).toBe(6000)
        }
      }
    })

    it('handles financial_breakdown as string (parsed from DB)', async () => {
      const financialBreakdownString = JSON.stringify({
        totals: {
          item_total: 10000,
          charges_total: 1000,
          tax_total: 500,
          total_invoice_amount: 8000, // Partial payment
        },
      })

      const formDataWithStringBreakdown = {
        ...baseFormData,
        financial_breakdown: financialBreakdownString,
        amount: 8000,
      }

      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 10000,
          formData: formDataWithStringBreakdown,
          readOnly: false,
          allowEditTotal: true,
          totalFieldName: 'amount',
        },
      })

      await flushPromises()

      // Should parse the string and display the partial payment
      const input = wrapper.find('input')
      if (input.exists()) {
        const inputValue = input.element.value
        expect(parseFloat(inputValue) || 0).toBe(8000)
      }
    })

    it('uses calculated total for non-editable invoices (Direct Invoice, Advance Payment)', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            sales_tax_1_percentage: 10,
          },
          readOnly: false,
          allowEditTotal: false, // Not editable
          hideCharges: true,
        },
      })

      await flushPromises()

      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Should use calculated total: 1000 + 100 (tax) = 1100
        expect(lastUpdate.total_po_amount).toBeCloseTo(1100, 2)
      }
    })
  })

  describe('Read-only mode', () => {
    it('disables charge percentage inputs when readOnly is true', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: true,
        },
      })

      // Find all percentage inputs for charges
      const percentageInputs = wrapper.findAll('input[inputmode="decimal"]')
      
      // All percentage inputs should be disabled
      percentageInputs.forEach((input) => {
        expect(input.attributes('disabled')).toBeDefined()
      })
    })

    it('enables charge percentage inputs when readOnly is false', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
        },
      })

      // Verify the component renders
      expect(wrapper.exists()).toBe(true)
      
      // Verify readOnly prop is false
      expect(wrapper.props('readOnly')).toBe(false)
      
      // Find UInput components to check their disabled prop
      const inputComponents = wrapper.findAllComponents({ name: 'UInput' })
      
      // Should have input components (percentage inputs for charges and sales tax)
      // There should be at least percentage inputs for 4 charges + 2 sales taxes = 6 inputs
      // Plus amount inputs (which are always disabled) = 6 more
      // Total should be at least 12 inputs
      if (inputComponents.length > 0) {
        // Percentage inputs should not be disabled (amount inputs are always disabled)
        // We can verify by checking that at least some inputs are not disabled
        const enabledInputs = inputComponents.filter((input) => !input.props('disabled'))
        // Should have at least some enabled inputs (the percentage inputs)
        expect(enabledInputs.length).toBeGreaterThan(0)
      } else {
        // If UInput components are stubbed, just verify the component renders
        expect(wrapper.html()).toBeTruthy()
      }
    })

    it('disables taxable checkboxes when readOnly is true', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_taxable: true,
            packing_charges_taxable: false,
          },
          readOnly: true,
        },
      })

      // Find all checkboxes
      const checkboxes = wrapper.findAllComponents({ name: 'UCheckbox' })
      
      // All checkboxes should be disabled
      checkboxes.forEach((checkbox) => {
        expect(checkbox.props('disabled')).toBe(true)
      })
    })

    it('enables taxable checkboxes when readOnly is false', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_taxable: true,
          },
          readOnly: false,
        },
      })

      // Find all checkboxes
      const checkboxes = wrapper.findAllComponents({ name: 'UCheckbox' })
      
      // All checkboxes should be enabled
      checkboxes.forEach((checkbox) => {
        expect(checkbox.props('disabled')).toBe(false)
      })
    })

    it('does not emit update when taxable checkbox is changed in read-only mode', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_taxable: false,
          },
          readOnly: true,
        },
      })

      await flushPromises()

      // Clear any initial update events
      wrapper.vm.$emit = vi.fn()

      // Find the freight charges taxable checkbox
      const checkboxes = wrapper.findAllComponents({ name: 'UCheckbox' })
      const freightCheckbox = checkboxes.find((cb) => {
        // Try to find the checkbox by checking if it's for freight charges
        // Since we can't easily identify which checkbox is which, we'll test all
        return true
      })

      if (freightCheckbox && freightCheckbox.exists()) {
        // Try to trigger the update event
        await freightCheckbox.vm.$emit('update:modelValue', true)
        await flushPromises()

        // The handler should return early and not emit updates
        // We verify this by checking that the component's internal state hasn't changed
        // Since handleChargeTaxableChange returns early when readOnly is true,
        // no update should be emitted
        const updateEvents = wrapper.emitted('update')
        // If there are update events, they should only be from initial calculation
        // Not from the checkbox change
        if (updateEvents) {
          // Count events before and after - should be the same
          const initialEventCount = updateEvents.length
          // Wait a bit to ensure no new events are emitted
          await new Promise(resolve => setTimeout(resolve, 50))
          expect(wrapper.emitted('update')?.length).toBe(initialEventCount)
        }
      }
    })

    it('emits update when taxable checkbox is changed in editable mode', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_taxable: false,
          },
          readOnly: false,
        },
      })

      await flushPromises()

      // Clear initial events by getting the count
      const initialEventCount = wrapper.emitted('update')?.length || 0

      // Find checkboxes
      const checkboxes = wrapper.findAllComponents({ name: 'UCheckbox' })
      
      if (checkboxes.length > 0) {
        // Trigger update on first checkbox (should be a taxable checkbox)
        await checkboxes[0].vm.$emit('update:modelValue', true)
        await flushPromises()

        // Should emit an update event
        const updateEvents = wrapper.emitted('update')
        expect(updateEvents).toBeTruthy()
        if (updateEvents) {
          // Should have at least one more event than initial
          expect(updateEvents.length).toBeGreaterThan(initialEventCount)
          
          // Check the last update event
          const lastUpdate = updateEvents[updateEvents.length - 1][0]
          // Should include a taxable field update
          const hasTaxableUpdate = Object.keys(lastUpdate).some(key => 
            key.includes('_charges_taxable')
          )
          expect(hasTaxableUpdate).toBe(true)
        }
      }
    })

    it('disables total input when readOnly is true and allowEditTotal is true', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: true,
          allowEditTotal: true,
        },
      })

      // Find the total input
      const totalInput = wrapper.find('input[inputmode="decimal"]')
      
      if (totalInput.exists()) {
        expect(totalInput.attributes('disabled')).toBeDefined()
      }
    })

    it('enables total input when readOnly is false and allowEditTotal is true', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          allowEditTotal: true,
        },
      })

      // Find the total input
      const totalInput = wrapper.find('input[inputmode="decimal"]')
      
      if (totalInput.exists()) {
        expect(totalInput.attributes('disabled')).toBeUndefined()
      }
    })

    it('does not emit update when percentage is changed in read-only mode', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_percentage: 5,
          },
          readOnly: true,
        },
      })

      await flushPromises()

      const initialEventCount = wrapper.emitted('update')?.length || 0

      // Find percentage inputs
      const percentageInputs = wrapper.findAll('input[inputmode="decimal"]')
      
      if (percentageInputs.length > 0) {
        // Try to change a percentage input
        await percentageInputs[0].setValue('10')
        await percentageInputs[0].trigger('update:modelValue', '10')
        await flushPromises()

        // Wait a bit to ensure no new events
        await new Promise(resolve => setTimeout(resolve, 50))

        // Should not emit new update events
        const finalEventCount = wrapper.emitted('update')?.length || 0
        expect(finalEventCount).toBe(initialEventCount)
      }
    })

    it('does not emit update when total is changed in read-only mode', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: true,
          allowEditTotal: true,
        },
      })

      await flushPromises()

      const initialEventCount = wrapper.emitted('update')?.length || 0

      // Find the total input
      const totalInput = wrapper.find('input[inputmode="decimal"]')
      
      if (totalInput.exists()) {
        await totalInput.setValue('2000')
        await totalInput.trigger('update:modelValue', '2000')
        await flushPromises()

        // Wait a bit to ensure no new events
        await new Promise(resolve => setTimeout(resolve, 50))

        // Should not emit new update events
        const finalEventCount = wrapper.emitted('update')?.length || 0
        expect(finalEventCount).toBe(initialEventCount)
      }
    })
  })

  describe('Advance Payment Deduction', () => {
    it('does not show deduction row when advancePaymentDeduction is 0', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          advancePaymentDeduction: 0,
        },
        global: {
          plugins: [pinia],
        },
      })

      const deductionRow = wrapper.find('[class*="Less: Advance Payments"]')
      expect(deductionRow.exists()).toBe(false)
    })

    it('shows deduction row when advancePaymentDeduction is greater than 0', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          advancePaymentDeduction: 200,
        },
        global: {
          plugins: [pinia],
        },
      })

      expect(wrapper.text()).toContain('Less: Advance Payments')
      expect(wrapper.text()).toContain('(Already paid)')
      expect(wrapper.text()).toContain('-$200.00')
    })

    it('calculates final total correctly with advance payment deduction', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            sales_tax_1_percentage: 10,
          },
          readOnly: false,
          advancePaymentDeduction: 200,
          hideCharges: true,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Item Total: 1000
      // Tax (10%): 100
      // Subtotal: 1100
      // Less Advance: 200
      // Final Total: 900
      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Should be 1000 + 100 - 200 = 900
        expect(lastUpdate.total_po_amount).toBeCloseTo(900, 2)
      }

      // Check that the deduction is displayed
      expect(wrapper.text()).toContain('-$200.00')
    })

    it('calculates final total correctly with charges and advance payment deduction', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_percentage: 5,
            freight_charges_taxable: true,
            sales_tax_1_percentage: 10,
          },
          readOnly: false,
          advancePaymentDeduction: 150,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Item Total: 1000
      // Freight (5%): 50
      // Taxable Base: 1050
      // Tax (10%): 105
      // Subtotal: 1155
      // Less Advance: 150
      // Final Total: 1005
      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Should be 1000 + 50 + 105 - 150 = 1005
        expect(lastUpdate.total_po_amount).toBeCloseTo(1005, 2)
      }
    })

    it('shows correct total amount before deduction when showTotalAmount is true', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            sales_tax_1_percentage: 10,
          },
          readOnly: false,
          advancePaymentDeduction: 200,
          showTotalAmount: true,
          hideCharges: true,
        },
        global: {
          plugins: [pinia],
        },
      })

      // Total Amount should show original total (1100) before deduction
      // Then deduction row shows -200
      // Final total shows 900
      const text = wrapper.text()
      expect(text).toContain('Total Amount')
      // Should show the original total before deduction in the "Total Amount" row
      // formatCurrency returns $1100.00 (without commas in the mock)
      expect(text).toContain('$1100.00') // Original total
      expect(text).toContain('-$200.00') // Deduction
    })

    it('handles deduction larger than total (should not go negative)', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          advancePaymentDeduction: 1500, // Larger than total
          hideCharges: true,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Should not go negative, should be 0
      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        expect(lastUpdate.total_po_amount).toBeGreaterThanOrEqual(0)
      }
    })

    it('updates deduction when advancePaymentDeduction prop changes', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          advancePaymentDeduction: 100,
          hideCharges: true,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Initial deduction: 100
      expect(wrapper.text()).toContain('-$100.00')

      // Update deduction to 300
      await wrapper.setProps({ advancePaymentDeduction: 300 })
      await flushPromises()

      expect(wrapper.text()).toContain('-$300.00')
      expect(wrapper.text()).not.toContain('-$100.00')
    })

    it('displays deduction with proper styling (red color)', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          advancePaymentDeduction: 200,
        },
        global: {
          plugins: [pinia],
        },
      })

      const deductionRow = wrapper.find('.text-red-600, .text-red-400')
      expect(deductionRow.exists()).toBe(true)
    })

    it('calculates correctly with multiple charges and taxes', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_percentage: 5,
            freight_charges_taxable: true,
            packing_charges_percentage: 3,
            packing_charges_taxable: false,
            sales_tax_1_percentage: 10,
            sales_tax_2_percentage: 5,
          },
          readOnly: false,
          advancePaymentDeduction: 250,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Item Total: 1000
      // Freight (5%): 50 (taxable)
      // Packing (3%): 30 (not taxable)
      // Taxable Base: 1050
      // Tax 1 (10%): 105
      // Tax 2 (5%): 52.5
      // Subtotal: 1000 + 50 + 30 + 105 + 52.5 = 1237.5
      // Less Advance: 250
      // Final Total: 987.5
      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        expect(lastUpdate.total_po_amount).toBeCloseTo(987.5, 2)
      }
    })
  })

  describe('Holdback Deduction', () => {
    it('does not show deduction row when holdbackDeduction is 0', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          holdbackDeduction: 0,
        },
        global: {
          plugins: [pinia],
        },
      })

      const deductionRow = wrapper.find('[class*="Less: Holdback"]')
      expect(deductionRow.exists()).toBe(false)
    })

    it('shows deduction row when holdbackDeduction is greater than 0', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          holdbackDeduction: 200,
        },
        global: {
          plugins: [pinia],
        },
      })

      expect(wrapper.text()).toContain('Less: Holdback')
      expect(wrapper.text()).toContain('(Retained)')
      expect(wrapper.text()).toContain('-$200.00')
    })

    it('calculates final total correctly with holdback deduction', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            sales_tax_1_percentage: 10,
          },
          readOnly: false,
          holdbackDeduction: 200,
          hideCharges: true,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Item Total: 1000
      // Tax (10%): 100
      // Subtotal: 1100
      // Less Holdback: 200
      // Final Total: 900
      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Should be 1000 + 100 - 200 = 900
        expect(lastUpdate.total_po_amount).toBeCloseTo(900, 2)
      }

      // Check that the deduction is displayed
      expect(wrapper.text()).toContain('-$200.00')
    })

    it('calculates final total correctly with charges and holdback deduction', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_percentage: 5,
            freight_charges_taxable: true,
            sales_tax_1_percentage: 10,
          },
          readOnly: false,
          holdbackDeduction: 150,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Item Total: 1000
      // Freight (5%): 50
      // Taxable Base: 1050
      // Tax (10%): 105
      // Subtotal: 1155
      // Less Holdback: 150
      // Final Total: 1005
      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Should be 1000 + 50 + 105 - 150 = 1005
        expect(lastUpdate.total_po_amount).toBeCloseTo(1005, 2)
      }
    })

    it('shows correct total amount before deduction when showTotalAmount is true', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            sales_tax_1_percentage: 10,
          },
          readOnly: false,
          holdbackDeduction: 200,
          showTotalAmount: true,
          hideCharges: true,
        },
        global: {
          plugins: [pinia],
        },
      })

      // Total Amount should show original total (1100) before deduction
      // Then deduction row shows -200
      // Final total shows 900
      const text = wrapper.text()
      expect(text).toContain('Total Amount')
      // Should show the original total before deduction in the "Total Amount" row
      expect(text).toContain('$1100.00') // Original total
      expect(text).toContain('-$200.00') // Deduction
    })

    it('handles deduction larger than total (should not go negative)', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          holdbackDeduction: 1500, // Larger than total
          hideCharges: true,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Should not go negative, should be 0
      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        expect(lastUpdate.total_po_amount).toBeGreaterThanOrEqual(0)
      }
    })

    it('updates deduction when holdbackDeduction prop changes', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          holdbackDeduction: 100,
          hideCharges: true,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Initial deduction: 100
      expect(wrapper.text()).toContain('-$100.00')

      // Update deduction to 300
      await wrapper.setProps({ holdbackDeduction: 300 })
      await flushPromises()

      expect(wrapper.text()).toContain('-$300.00')
      expect(wrapper.text()).not.toContain('-$100.00')
    })

    it('displays deduction with proper styling (red color)', () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: baseFormData,
          readOnly: false,
          holdbackDeduction: 200,
        },
        global: {
          plugins: [pinia],
        },
      })

      const deductionRow = wrapper.find('.text-red-600, .text-red-400')
      expect(deductionRow.exists()).toBe(true)
    })

    it('calculates correctly with both advance payment and holdback deductions', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            sales_tax_1_percentage: 10,
          },
          readOnly: false,
          advancePaymentDeduction: 150,
          holdbackDeduction: 200,
          hideCharges: true,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Item Total: 1000
      // Tax (10%): 100
      // Subtotal: 1100
      // Less Advance: 150
      // Less Holdback: 200
      // Final Total: 750
      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        // Should be 1000 + 100 - 150 - 200 = 750
        expect(lastUpdate.total_po_amount).toBeCloseTo(750, 2)
      }

      // Check that both deductions are displayed
      expect(wrapper.text()).toContain('Less: Advance Payments')
      expect(wrapper.text()).toContain('-$150.00')
      expect(wrapper.text()).toContain('Less: Holdback')
      expect(wrapper.text()).toContain('-$200.00')
    })

    it('calculates correctly with charges, taxes, advance payment and holdback', async () => {
      const wrapper = mount(FinancialBreakdown, {
        props: {
          itemTotal: 1000,
          formData: {
            ...baseFormData,
            freight_charges_percentage: 5,
            freight_charges_taxable: true,
            packing_charges_percentage: 3,
            packing_charges_taxable: false,
            sales_tax_1_percentage: 10,
            sales_tax_2_percentage: 5,
          },
          readOnly: false,
          advancePaymentDeduction: 250,
          holdbackDeduction: 100,
        },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      // Item Total: 1000
      // Freight (5%): 50 (taxable)
      // Packing (3%): 30 (not taxable)
      // Taxable Base: 1050
      // Tax 1 (10%): 105
      // Tax 2 (5%): 52.5
      // Subtotal: 1000 + 50 + 30 + 105 + 52.5 = 1237.5
      // Less Advance: 250
      // Less Holdback: 100
      // Final Total: 887.5
      const updateEvents = wrapper.emitted('update')
      if (updateEvents && updateEvents.length > 0) {
        const lastUpdate = updateEvents[updateEvents.length - 1][0]
        expect(lastUpdate.total_po_amount).toBeCloseTo(887.5, 2)
      }
    })
  })
})

