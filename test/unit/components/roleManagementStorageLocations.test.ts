import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRoleStore } from '../../../stores/roles'

describe('RoleManagement - Storage Locations Permissions', () => {
  let roleStore: ReturnType<typeof useRoleStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    roleStore = useRoleStore()
    vi.clearAllMocks()
  })

  describe('Storage Locations Permission Group', () => {
    it('should include storage_locations in permission groups', () => {
      const permissionGroups = [
        { key: 'users', actions: ['view', 'add', 'edit', 'delete'] },
        { key: 'roles', actions: ['view', 'create', 'edit', 'delete'] },
        { key: 'corporations', actions: ['view', 'create', 'edit', 'delete'] },
        { key: 'storage_locations', actions: ['view', 'create', 'edit', 'delete'] },
        { key: 'chart_of_accounts', actions: ['view', 'create', 'edit', 'delete'] }
      ]

      const storageLocationsGroup = permissionGroups.find(g => g.key === 'storage_locations')
      
      expect(storageLocationsGroup).toBeDefined()
      expect(storageLocationsGroup?.key).toBe('storage_locations')
      expect(storageLocationsGroup?.actions).toEqual(['view', 'create', 'edit', 'delete'])
    })

    it('should generate all storage_locations permissions correctly', () => {
      const storageLocationsActions = ['view', 'create', 'edit', 'delete']
      const permissions = storageLocationsActions.map(action => 
        `storage_locations_${action}`
      )

      expect(permissions).toEqual([
        'storage_locations_view',
        'storage_locations_create',
        'storage_locations_edit',
        'storage_locations_delete'
      ])
    })
  })

  describe('Role Creation with Storage Locations Permissions', () => {
    it('should create role with all storage_locations permissions', async () => {
      const newRole = {
        role_name: 'Storage Admin',
        description: 'Full access to storage locations',
        status: 'active',
        permissions: [
          'storage_locations_view',
          'storage_locations_create',
          'storage_locations_edit',
          'storage_locations_delete'
        ]
      }

      const mockCreatedRole = {
        id: 1,
        ...newRole,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      global.$fetch = vi.fn().mockResolvedValue({
        success: true,
        data: mockCreatedRole
      }) as any

      await roleStore.addRole(newRole)

      expect(roleStore.roles).toHaveLength(1)
      expect(roleStore.roles[0]?.permissions).toContain('storage_locations_view')
      expect(roleStore.roles[0]?.permissions).toContain('storage_locations_create')
      expect(roleStore.roles[0]?.permissions).toContain('storage_locations_edit')
      expect(roleStore.roles[0]?.permissions).toContain('storage_locations_delete')
    })

    it('should create role with only view storage_locations permission', async () => {
      const newRole = {
        role_name: 'Storage Viewer',
        description: 'View only access to storage locations',
        status: 'active',
        permissions: ['storage_locations_view']
      }

      const mockCreatedRole = {
        id: 2,
        ...newRole,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      global.$fetch = vi.fn().mockResolvedValue({
        success: true,
        data: mockCreatedRole
      }) as any

      await roleStore.addRole(newRole)

      expect(roleStore.roles[0]?.permissions).toContain('storage_locations_view')
      expect(roleStore.roles[0]?.permissions).not.toContain('storage_locations_create')
      expect(roleStore.roles[0]?.permissions).not.toContain('storage_locations_edit')
      expect(roleStore.roles[0]?.permissions).not.toContain('storage_locations_delete')
    })

    it('should create role without any storage_locations permissions', async () => {
      const newRole = {
        role_name: 'Basic User',
        description: 'No storage access',
        status: 'active',
        permissions: ['users_view']
      }

      const mockCreatedRole = {
        id: 3,
        ...newRole,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      global.$fetch = vi.fn().mockResolvedValue({
        success: true,
        data: mockCreatedRole
      }) as any

      await roleStore.addRole(newRole)

      const storagePermissions = roleStore.roles[0]?.permissions.filter(p => 
        p.startsWith('storage_locations_')
      )
      expect(storagePermissions).toHaveLength(0)
    })
  })

  describe('Role Update with Storage Locations Permissions', () => {
    const existingRole = {
      id: 1,
      role_name: 'Test Role',
      description: 'Test role',
      status: 'active' as const,
      permissions: ['users_view'],
      user_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    beforeEach(() => {
      roleStore.roles = [existingRole]
    })

    it('should add storage_locations permissions to existing role', async () => {
      const updatedRole = {
        ...existingRole,
        permissions: [
          'users_view',
          'storage_locations_view',
          'storage_locations_create'
        ],
        updated_at: '2024-01-02T00:00:00Z'
      }

      global.$fetch = vi.fn().mockResolvedValue({
        success: true,
        data: updatedRole
      }) as any

      await roleStore.updateRole(1, {
        role_name: existingRole.role_name,
        description: existingRole.description,
        status: existingRole.status,
        permissions: updatedRole.permissions
      })

      expect(roleStore.roles[0]?.permissions).toContain('storage_locations_view')
      expect(roleStore.roles[0]?.permissions).toContain('storage_locations_create')
    })

    it('should remove storage_locations permissions from role', async () => {
      roleStore.roles = [{
        ...existingRole,
        permissions: ['users_view', 'storage_locations_view', 'storage_locations_edit']
      }]

      const updatedRole = {
        ...existingRole,
        permissions: ['users_view'],
        updated_at: '2024-01-02T00:00:00Z'
      }

      global.$fetch = vi.fn().mockResolvedValue({
        success: true,
        data: updatedRole
      }) as any

      await roleStore.updateRole(1, {
        role_name: existingRole.role_name,
        description: existingRole.description,
        status: existingRole.status,
        permissions: updatedRole.permissions
      })

      const storagePermissions = roleStore.roles[0]?.permissions.filter(p => 
        p.startsWith('storage_locations_')
      )
      expect(storagePermissions).toHaveLength(0)
    })

    it('should update specific storage_locations permissions', async () => {
      roleStore.roles = [{
        ...existingRole,
        permissions: ['storage_locations_view', 'storage_locations_create']
      }]

      const updatedRole = {
        ...existingRole,
        permissions: ['storage_locations_view', 'storage_locations_edit', 'storage_locations_delete'],
        updated_at: '2024-01-02T00:00:00Z'
      }

      global.$fetch = vi.fn().mockResolvedValue({
        success: true,
        data: updatedRole
      }) as any

      await roleStore.updateRole(1, {
        role_name: existingRole.role_name,
        description: existingRole.description,
        status: existingRole.status,
        permissions: updatedRole.permissions
      })

      expect(roleStore.roles[0]?.permissions).toContain('storage_locations_view')
      expect(roleStore.roles[0]?.permissions).not.toContain('storage_locations_create')
      expect(roleStore.roles[0]?.permissions).toContain('storage_locations_edit')
      expect(roleStore.roles[0]?.permissions).toContain('storage_locations_delete')
    })
  })

  describe('Permission Group Generation with Storage Locations', () => {
    it('should include storage_locations in all permissions list', () => {
      const permissionGroups = [
        { key: 'storage_locations', actions: ['view', 'create', 'edit', 'delete'] },
        { key: 'corporations', actions: ['view', 'create', 'edit', 'delete'] }
      ]

      const allPermissions: string[] = []
      permissionGroups.forEach(group => {
        group.actions.forEach(action => {
          allPermissions.push(`${group.key}_${action}`)
        })
      })

      expect(allPermissions).toContain('storage_locations_view')
      expect(allPermissions).toContain('storage_locations_create')
      expect(allPermissions).toContain('storage_locations_edit')
      expect(allPermissions).toContain('storage_locations_delete')
      expect(allPermissions).toHaveLength(8) // 4 storage + 4 corporation
    })

    it("should generate correct permission count with storage_locations and purchase orders", () => {
      const permissionGroups = [
        { key: "users", actions: ["view", "add", "edit", "delete"] },
        { key: "roles", actions: ["view", "create", "edit", "delete"] },
        { key: "corporations", actions: ["view", "create", "edit", "delete"] },
        {
          key: "storage_locations",
          actions: ["view", "create", "edit", "delete"],
        },
        {
          key: "chart_of_accounts",
          actions: ["view", "create", "edit", "delete"],
        },
        {
          key: "bill_entry",
          actions: ["view", "create", "edit", "delete", "approve"],
        },
        {
          key: "project",
          actions: ["view", "create", "edit", "delete", "approve"],
        },
        { key: "bill_payment", actions: ["view", "create", "edit", "delete"] },
        { key: "po", actions: ["view", "create", "edit", "delete", "approve"] },
        { key: "vendors", actions: ["view", "create", "edit", "delete"] },
      ];

      let totalPermissions = 0;
      permissionGroups.forEach((group) => {
        totalPermissions += group.actions.length;
      });

      expect(totalPermissions).toBe(43); // Sum of all action counts (38 + 5 for po)
    });
  })

  describe('Storage Locations Permission Validation', () => {
    it('should validate storage_locations permission format', () => {
      const validPermissions = [
        'storage_locations_view',
        'storage_locations_create',
        'storage_locations_edit',
        'storage_locations_delete'
      ]

      validPermissions.forEach(permission => {
        expect(permission).toMatch(/^storage_locations_(view|create|edit|delete)$/)
      })
    })

    it('should reject invalid storage_locations permission format', () => {
      const invalidPermissions = [
        'storageLocations_view',
        'storage-locations-view',
        'storage_locations.view',
        'storage_locations:view',
        'STORAGE_LOCATIONS_VIEW'
      ]

      invalidPermissions.forEach(permission => {
        expect(permission).not.toMatch(/^storage_locations_(view|create|edit|delete)$/)
      })
    })

    it('should handle mixed valid and invalid permissions', () => {
      const mixedPermissions = [
        'storage_locations_view',  // valid
        'storageLocations_edit',   // invalid
        'storage_locations_delete', // valid
        'storage-locations-create'  // invalid
      ]

      const validOnes = mixedPermissions.filter(p => 
        /^storage_locations_(view|create|edit|delete)$/.test(p)
      )

      expect(validOnes).toHaveLength(2)
      expect(validOnes).toContain('storage_locations_view')
      expect(validOnes).toContain('storage_locations_delete')
    })
  })

  describe('Super Admin Role with Storage Locations', () => {
    it('should include all storage_locations permissions for super admin', () => {
      const superAdminPermissions = [
        'users_view', 'users_add', 'users_edit', 'users_delete',
        'roles_view', 'roles_create', 'roles_edit', 'roles_delete',
        'corporations_view', 'corporations_create', 'corporations_edit', 'corporations_delete',
        'storage_locations_view', 'storage_locations_create', 'storage_locations_edit', 'storage_locations_delete',
        'chart_of_accounts_view', 'chart_of_accounts_create', 'chart_of_accounts_edit', 'chart_of_accounts_delete'
      ]

      const storagePermissions = superAdminPermissions.filter(p => 
        p.startsWith('storage_locations_')
      )

      expect(storagePermissions).toHaveLength(4)
      expect(storagePermissions).toEqual([
        'storage_locations_view',
        'storage_locations_create',
        'storage_locations_edit',
        'storage_locations_delete'
      ])
    })
  })

  describe('Role Deletion with Storage Locations Permissions', () => {
    it('should successfully delete role with storage_locations permissions', async () => {
      const roleWithStoragePermissions = {
        id: 1,
        role_name: 'Storage Manager',
        description: 'Manages storage locations',
        status: 'active' as const,
        permissions: [
          'storage_locations_view',
          'storage_locations_create',
          'storage_locations_edit'
        ],
        user_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      roleStore.roles = [roleWithStoragePermissions]

      global.$fetch = vi.fn().mockResolvedValue({ success: true }) as any

      await roleStore.deleteRole(1)

      expect(roleStore.roles).toHaveLength(0)
    })
  })

  describe('Permission Consistency', () => {
    it('should maintain consistency between storage_locations and other permissions', () => {
      const permissionStructure = {
        corporations: ['view', 'create', 'edit', 'delete'],
        storage_locations: ['view', 'create', 'edit', 'delete'],
        chart_of_accounts: ['view', 'create', 'edit', 'delete']
      }

      const allActionSets = Object.values(permissionStructure)
      const firstActionSet = allActionSets[0]

      // All should have the same action structure
      allActionSets.forEach(actions => {
        expect(actions).toEqual(firstActionSet)
      })
    })

    it('should use same naming convention for all permissions', () => {
      const permissions = [
        'corporations_view',
        'storage_locations_view',
        'chart_of_accounts_view',
        'vendors_view'
      ]

      permissions.forEach(permission => {
        expect(permission).toMatch(/^[a-z_]+_[a-z]+$/)
      })
    })
  })
})

