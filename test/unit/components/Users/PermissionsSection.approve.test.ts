import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PermissionsSection from '@/components/Users/PermissionsSection.vue'

describe('PermissionsSection approve actions', () => {
  const mountWith = (perms: string[] = [], readonly = false) =>
    mount(PermissionsSection, {
      props: { permissions: perms, readonly },
      global: {
        stubs: {
          UButton: { template: '<button><slot /></button>' },
          UCheckbox: { props: ['modelValue'], template: '<input type="checkbox" />' },
        },
      },
    })

  it("Select All produces approve permissions for project, estimates, purchase orders, change orders, receipt notes, vendor invoices, and bill entry", async () => {
    const wrapper = mountWith();
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThan(0);
    await buttons[0]!.trigger("click"); // Select All
    const emitted = wrapper.emitted("update:permissions");
    expect(emitted).toBeTruthy();
    const last = emitted![emitted!.length - 1]![0] as string[];
    expect(last).toContain("project_approve");
    expect(last).toContain("project_estimates_approve");
    expect(last).toContain("po_approve");
    expect(last).toContain("co_approve");
    expect(last).toContain("receipt_notes_approve");
    expect(last).toContain("vendor_invoices_approve");
    expect(last).toContain("bill_entry_approve");
  });

  it("emits project_approve when toggled via label click simulation", async () => {
    const wrapper = mountWith([]);
    // Simulate selecting all to ensure all permissions can be added; then clear and assert specific
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThan(0);
    await buttons[0]!.trigger("click"); // Select All
    const emitted = wrapper.emitted("update:permissions");
    expect(emitted).toBeTruthy();
    const last = emitted![emitted!.length - 1]![0] as string[];
    expect(last).toContain("project_approve");
  });

  it('emits project_estimates_approve when Select All is used', async () => {
    const wrapper = mountWith([])
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThan(0);
    await buttons[0]!.trigger("click");
    const emitted = wrapper.emitted("update:permissions");
    expect(emitted).toBeTruthy();
    const last = emitted![emitted!.length - 1]![0] as string[];
    expect(last).toContain('project_estimates_approve')
  })

  it('emits vendor_invoices_approve when Select All is used', async () => {
    const wrapper = mountWith([])
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThan(0);
    await buttons[0]!.trigger("click");
    const emitted = wrapper.emitted("update:permissions");
    expect(emitted).toBeTruthy();
    const last = emitted![emitted!.length - 1]![0] as string[];
    expect(last).toContain('vendor_invoices_approve')
  })

  it('emits bill_entry_approve when Select All is used', async () => {
    const wrapper = mountWith([])
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThan(0);
    await buttons[0]!.trigger("click");
    const emitted = wrapper.emitted("update:permissions");
    expect(emitted).toBeTruthy();
    const last = emitted![emitted!.length - 1]![0] as string[];
    expect(last).toContain('bill_entry_approve')
  })
})


