import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RoleManagement from '@/components/Users/RoleManagement.vue'

// Mocks
const mockRoleStore = {
  loading: false,
  error: null,
  roles: [],
  hasData: true,
  fetchRoles: vi.fn(),
  addRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
}
const mockUsersStore = {
  users: [],
  hasData: true,
  fetchUsers: vi.fn(),
}
const mockAuthStore = {
  user: { email: 'test@example.com' },
}

vi.mock('@/stores/roles', () => ({ useRoleStore: () => mockRoleStore }))
vi.mock('@/stores/userProfiles', () => ({ useUserProfilesStore: () => mockUsersStore }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mockAuthStore }))
vi.mock('@/composables/usePermissions', () => ({ usePermissions: () => ({ hasPermission: () => true }) }))
vi.mock('@/composables/useTableStandard', () => ({
  useTableStandard: () => ({
    pagination: { value: { pageSize: 10 } },
    paginationOptions: {},
    pageSizeOptions: [10, 20],
    updatePageSize: vi.fn(),
    getPaginationProps: vi.fn(() => ({})),
    getPageInfo: vi.fn(() => ({ value: '' })),
    shouldShowPagination: vi.fn(() => ({ value: false })),
  }),
}))
vi.mock('#app', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('@/composables/useDateFormat', () => ({ useDateFormat: () => ({ formatDate: (d: any) => String(d) }) }))

describe('RoleManagement approve permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Add Role initializes with project_approve and project_estimates_approve', async () => {
    const wrapper = mount(RoleManagement, {
      global: {
        stubs: {
          UButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          UTable: { template: '<div />' },
          USelect: { template: '<select />' },
          UPagination: { template: '<div />' },
          USkeleton: { template: '<div />' },
          UModal: { template: '<div><slot name="body" /><slot name="footer" /></div>' },
          UTextarea: { template: '<textarea />' },
          UAlert: { template: '<div />' },
          UBadge: { template: '<span />' },
          UIcon: { template: '<i />' },
          UCheckbox: { template: '<input type="checkbox" />' },
          PermissionsSection: { template: '<div />' },
        },
      },
    })

    // Click Add Role
    const addBtn = wrapper.findAll('button').find(b => /Add Role/.test(b.text()))
    expect(addBtn).toBeTruthy()
    await addBtn!.trigger('click')

    // @ts-expect-error access internal reactive state for assertion
    const perms: string[] = wrapper.vm.form.permissions
    expect(perms).toContain('project_approve')
    expect(perms).toContain('project_estimates_approve')
  })

  it('Add Role initializes with vendor_invoices_approve and bill_entry_approve', async () => {
    const wrapper = mount(RoleManagement, {
      global: {
        stubs: {
          UButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          UTable: { template: '<div />' },
          USelect: { template: '<select />' },
          UPagination: { template: '<div />' },
          USkeleton: { template: '<div />' },
          UModal: { template: '<div><slot name="body" /><slot name="footer" /></div>' },
          UTextarea: { template: '<textarea />' },
          UAlert: { template: '<div />' },
          UBadge: { template: '<span />' },
          UIcon: { template: '<i />' },
          UCheckbox: { template: '<input type="checkbox" />' },
          PermissionsSection: { template: '<div />' },
        },
      },
    })

    // Click Add Role
    const addBtn = wrapper.findAll('button').find(b => /Add Role/.test(b.text()))
    expect(addBtn).toBeTruthy()
    await addBtn!.trigger('click')

    // @ts-expect-error access internal reactive state for assertion
    const perms: string[] = wrapper.vm.form.permissions
    expect(perms).toContain('vendor_invoices_approve')
    expect(perms).toContain('bill_entry_approve')
  })

  it('Add Role initializes with all vendor_invoices permissions', async () => {
    const wrapper = mount(RoleManagement, {
      global: {
        stubs: {
          UButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          UTable: { template: '<div />' },
          USelect: { template: '<select />' },
          UPagination: { template: '<div />' },
          USkeleton: { template: '<div />' },
          UModal: { template: '<div><slot name="body" /><slot name="footer" /></div>' },
          UTextarea: { template: '<textarea />' },
          UAlert: { template: '<div />' },
          UBadge: { template: '<span />' },
          UIcon: { template: '<i />' },
          UCheckbox: { template: '<input type="checkbox" />' },
          PermissionsSection: { template: '<div />' },
        },
      },
    })

    // Click Add Role
    const addBtn = wrapper.findAll('button').find(b => /Add Role/.test(b.text()))
    expect(addBtn).toBeTruthy()
    await addBtn!.trigger('click')

    // @ts-expect-error access internal reactive state for assertion
    const perms: string[] = wrapper.vm.form.permissions
    expect(perms).toContain('vendor_invoices_view')
    expect(perms).toContain('vendor_invoices_create')
    expect(perms).toContain('vendor_invoices_edit')
    expect(perms).toContain('vendor_invoices_delete')
    expect(perms).toContain('vendor_invoices_approve')
  })
})


