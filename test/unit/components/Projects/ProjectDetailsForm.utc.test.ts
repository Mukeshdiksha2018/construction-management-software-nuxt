import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { CalendarDate } from '@internationalized/date'
import ProjectDetailsForm from '@/components/Projects/ProjectDetailsForm.vue'
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => ({ selectedCorporation: { uuid: 'corp-1', corporation_name: 'Corp' } })
}))
vi.mock('@/stores/projectTypes', () => ({
  useProjectTypesStore: () => ({})
}))
vi.mock('@/stores/serviceTypes', () => ({
  useServiceTypesStore: () => ({})
}))
vi.mock('@/stores/projectAddresses', () => ({
  useProjectAddressesStore: () => ({ getAddresses: vi.fn(), fetchAddresses: vi.fn() })
}))
vi.mock('@/stores/projects', () => ({
  useProjectsStore: () => ({ 
    currentProject: null, 
    updateProject: vi.fn(),
    fetchProjectsMetadata: vi.fn().mockResolvedValue(undefined),
    projectsMetadata: [],
    localCustomers: ref([]),
    customersLoading: ref(false),
    customersError: ref(null),
    fetchLocalCustomers: vi.fn(() => Promise.resolve()),
    clearLocalCustomers: vi.fn()
  })
}))

// Mock useUTCDateFormat with the actual fix implementation
vi.mock('@/composables/useUTCDateFormat', () => ({
  useUTCDateFormat: () => ({
    toUTCString: (dateInput: string | Date | null): string | null => {
      if (!dateInput) return null
      if (dateInput instanceof Date) {
        return dayjs(dateInput).utc().toISOString()
      }
      const localDate = dayjs(dateInput).startOf('day')
      return localDate.utc().toISOString()
    },
    fromUTCString: (utcString: string | null): string => {
      if (!utcString) return ''
      // This is the fix: convert to local timezone first, then format
      return dayjs.utc(utcString).local().format('YYYY-MM-DD')
    }
  })
}))

describe('ProjectDetailsForm UTC dates', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  const mountForm = (formOverrides: any = {}, extraProps: any = {}) => {
    const baseForm = {
      project_name: "",
      project_id: "",
      project_type_uuid: "",
      service_type_uuid: "",
      project_status: "Pending",
      estimated_amount: 0,
      area_sq_ft: null,
      no_of_rooms: null,
      contingency_percentage: 0,
      project_start_date: "",
      project_estimated_completion_date: "",
      only_total: false,
      enable_labor: false,
      enable_material: false,
      attachments: [],
      tempAddresses: [],
    };
    return mount(ProjectDetailsForm, {
      props: {
        form: { ...baseForm, ...formOverrides },
        editingProject: false,
        ...extraProps,
      },
      global: {
        stubs: {
          UCard: { template: "<div><slot /></div>" },
          UInput: { template: "<input />" },
          USelectMenu: { template: "<select />" },
          UButton: { template: "<button><slot /></button>" },
          UPopover: { template: '<div><slot /><slot name="content" /></div>' },
          UCalendar: { template: "<div />" },
          UCheckbox: { template: '<input type="checkbox" />' },
          UIcon: { template: "<i />" },
          UBadge: { template: "<span><slot /></span>" },
          UFileUpload: {
            template:
              '<div><slot :open="() => {}" :removeFile="() => {}" /></div>',
          },
          AuditLogModal: { template: "<div />" },
          FilePreview: { template: "<div />" },
          ProjectTypeSelect: { template: "<div />" },
          ServiceTypeSelect: { template: "<div />" },
          CorporationSelect: { template: "<div />" },
        },
      },
    });
  };

  it('emits UTC ISO when Start Date is set via calendar', async () => {
    const wrapper = mountForm()
    // @ts-expect-error access setup-exposed computed
    wrapper.vm.startDateValue = new CalendarDate(2025, 10, 30)
    // The component emits update:form immediately via handleFormUpdate
    const emits = wrapper.emitted('update:form')
    expect(emits && emits.length).toBeGreaterThan(0)
    const last = emits![emits!.length - 1][0]
    expect(String(last.project_start_date)).toMatch(/T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('emits UTC ISO when Estimated Completion is set via calendar', async () => {
    const wrapper = mountForm()
    // @ts-expect-error access setup-exposed computed
    wrapper.vm.estimatedCompletionDateValue = new CalendarDate(2025, 11, 5)
    const emits = wrapper.emitted('update:form')
    expect(emits && emits.length).toBeGreaterThan(0)
    const last = emits![emits!.length - 1][0]
    expect(String(last.project_estimated_completion_date)).toMatch(/T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it("computes metadata for approved estimate", () => {
    const wrapper = mountForm(
      {},
      {
        editingProject: true,
        latestEstimate: {
          status: "Approved",
          final_amount: 12500,
        },
      }
    );

    // @ts-expect-error accessing setup state for test
    expect(wrapper.vm.estimatedAmountDisplay).toContain("Approved");
    // @ts-expect-error accessing setup state for test
    expect(wrapper.vm.estimatedAmountDisplay).toContain("$12,500.00");
    // @ts-expect-error accessing setup state for test
    expect(wrapper.vm.estimateStatusMetadata.helper).toContain("approved");
  });

  it("encourages creating an estimate when none exists", () => {
    const wrapper = mountForm({}, { editingProject: true });

    // @ts-expect-error accessing setup state for test
    expect(wrapper.vm.estimatedAmountDisplay).toBe("No estimate yet");
    // @ts-expect-error accessing setup state for test
    expect(wrapper.vm.estimateStatusMetadata.helper).toContain(
      "Create an estimate"
    );
  });

  describe("Date Selection Fix", () => {
    it("should parse UTC date string correctly without one-day shift for start date", () => {
      // Simulate a date stored in UTC that was selected as Jan 15, 2025
      // When user selects Jan 15 in PST (UTC-8), it gets stored as 2025-01-15T08:00:00.000Z
      const storedUTC = "2025-01-15T08:00:00.000Z";
      const wrapper = mountForm({ project_start_date: storedUTC });

      // @ts-expect-error accessing setup state for test
      const startDateValue = wrapper.vm.startDateValue;
      expect(startDateValue).toBeTruthy();
      expect(startDateValue.year).toBe(2025);
      expect(startDateValue.month).toBe(1);
      expect(startDateValue.day).toBe(15); // Critical: should be 15, not 14
    });

    it("should parse UTC date string correctly without one-day shift for completion date", () => {
      const storedUTC = "2025-12-31T08:00:00.000Z";
      const wrapper = mountForm({
        project_estimated_completion_date: storedUTC,
      });

      // @ts-expect-error accessing setup state for test
      const completionDateValue = wrapper.vm.estimatedCompletionDateValue;
      expect(completionDateValue).toBeTruthy();
      expect(completionDateValue.year).toBe(2025);
      expect(completionDateValue.month).toBe(12);
      expect(completionDateValue.day).toBe(31); // Critical: should be 31, not 30
    });

    it("should preserve selected start date through round-trip conversion", async () => {
      const wrapper = mountForm();

      // User selects January 15, 2025
      const selectedDate = new CalendarDate(2025, 1, 15);
      // @ts-expect-error accessing setup state for test
      wrapper.vm.startDateValue = selectedDate;
      await wrapper.vm.$nextTick();

      // Check that update:form was emitted with UTC string
      const updateEvents = wrapper.emitted("update:form");
      expect(updateEvents).toBeTruthy();
      const lastEvent = updateEvents![updateEvents!.length - 1][0];
      expect(lastEvent.project_start_date).toBeTruthy();
      expect(lastEvent.project_start_date).toMatch(
        /T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );

      // Now simulate reading it back - this is the critical test
      const wrapper2 = mountForm({
        project_start_date: lastEvent.project_start_date,
      });

      // Should still show Jan 15, not Jan 14 (the fix ensures this)
      // @ts-expect-error accessing setup state for test
      const readBackDate = wrapper2.vm.startDateValue;
      expect(readBackDate).toBeTruthy();
      expect(readBackDate.year).toBe(2025);
      expect(readBackDate.month).toBe(1);
      expect(readBackDate.day).toBe(15); // Critical: should be 15, not 14
    });

    it("should preserve selected completion date through round-trip conversion", async () => {
      const wrapper = mountForm();

      // User selects February 20, 2025
      const selectedDate = new CalendarDate(2025, 2, 20);
      // @ts-expect-error accessing setup state for test
      wrapper.vm.estimatedCompletionDateValue = selectedDate;
      await wrapper.vm.$nextTick();

      // Check that update:form was emitted
      const updateEvents = wrapper.emitted("update:form");
      expect(updateEvents).toBeTruthy();
      const lastEvent = updateEvents![updateEvents!.length - 1][0];
      expect(lastEvent.project_estimated_completion_date).toBeTruthy();
      expect(lastEvent.project_estimated_completion_date).toMatch(
        /T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );

      // Read it back - should still be Feb 20 (the fix ensures this)
      const wrapper2 = mountForm({
        project_estimated_completion_date:
          lastEvent.project_estimated_completion_date,
      });

      // @ts-expect-error accessing setup state for test
      const readBackDate = wrapper2.vm.estimatedCompletionDateValue;
      expect(readBackDate).toBeTruthy();
      expect(readBackDate.year).toBe(2025);
      expect(readBackDate.month).toBe(2);
      expect(readBackDate.day).toBe(20); // Critical: should be 20, not 19
    });

    it("should parse date string directly without timezone conversion issues", () => {
      // Test the direct parsing logic used in the component
      // The key test: when we have a UTC date that represents a specific local date,
      // reading it back should show that same local date (not shifted by one day)

      // Test with a date that was stored as Jan 15 in a timezone (e.g., PST)
      // When stored, Jan 15 midnight PST = 2025-01-15T08:00:00.000Z
      // When read back with the fix, it should show Jan 15 (not Jan 14)
      const storedUTC = "2025-01-15T08:00:00.000Z";
      const wrapper = mountForm({ project_start_date: storedUTC });
      // @ts-expect-error accessing setup state for test
      const dateValue = wrapper.vm.startDateValue;

      expect(dateValue).toBeTruthy();
      // The critical test: with the fix, fromUTCString converts to local first
      // So 2025-01-15T08:00:00.000Z (Jan 15 midnight PST) should show as Jan 15
      // The exact day depends on the test environment timezone, but it should be consistent
      const localDate = dayjs.utc(storedUTC).local();
      expect(dateValue.year).toBe(localDate.year());
      expect(dateValue.month).toBe(localDate.month() + 1); // dayjs months are 0-indexed
      expect(dateValue.day).toBe(localDate.date());
    });

    it("should handle null dates gracefully", () => {
      const wrapper = mountForm({
        project_start_date: null,
        project_estimated_completion_date: null,
      });

      // @ts-expect-error accessing setup state for test
      expect(wrapper.vm.startDateValue).toBeNull();
      // @ts-expect-error accessing setup state for test
      expect(wrapper.vm.estimatedCompletionDateValue).toBeNull();
    });
  });
})


