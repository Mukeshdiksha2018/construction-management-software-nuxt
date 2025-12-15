import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePermissions } from '../../../composables/usePermissions'
import { useAuthStore } from '../../../stores/auth'
import { useRoleStore } from '../../../stores/roles'
import { useUserProfilesStore } from '../../../stores/userProfiles'

describe('usePermissions - Storage Locations', () => {
  let authStore: ReturnType<typeof useAuthStore>
  let roleStore: ReturnType<typeof useRoleStore>
  let userProfilesStore: ReturnType<typeof useUserProfilesStore>

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    user_metadata: {}
  }

  const mockUserProfile = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    roleId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockRoleWithAllStoragePermissions = {
    id: 1,
    role_name: 'Storage Admin',
    description: 'Full access to storage locations',
    status: 'active',
    permissions: [
      'storage_locations_view',
      'storage_locations_create',
      'storage_locations_edit',
      'storage_locations_delete'
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockRoleWithViewOnlyPermission = {
    id: 2,
    role_name: 'Storage Viewer',
    description: 'View only access to storage locations',
    status: 'active',
    permissions: ['storage_locations_view'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockRoleWithNoStoragePermissions = {
    id: 3,
    role_name: 'Basic User',
    description: 'No storage access',
    status: 'active',
    permissions: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    roleStore = useRoleStore()
    userProfilesStore = useUserProfilesStore()

    // Setup default state
    authStore.user = mockUser
    userProfilesStore.users = [mockUserProfile]
    
    vi.clearAllMocks()
  })

  describe('storage_locations_view permission', () => {
    it('should return true when user has view permission', () => {
      roleStore.roles = [mockRoleWithAllStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(true)
    })

    it('should return false when user lacks view permission', () => {
      roleStore.roles = [mockRoleWithNoStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(false)
    })

    it('should return true for view-only user', () => {
      // Update user profile to point to view-only role
      userProfilesStore.users = [{
        ...mockUserProfile,
        roleId: 2  // Point to view-only role
      }]
      roleStore.roles = [mockRoleWithViewOnlyPermission]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(true)
    })
  })

  describe('storage_locations_create permission', () => {
    it('should return true when user has create permission', () => {
      roleStore.roles = [mockRoleWithAllStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_create')).toBe(true)
    })

    it('should return false when user lacks create permission', () => {
      roleStore.roles = [mockRoleWithViewOnlyPermission]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_create')).toBe(false)
    })

    it('should return false when role has no permissions', () => {
      roleStore.roles = [mockRoleWithNoStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_create')).toBe(false)
    })
  })

  describe('storage_locations_edit permission', () => {
    it('should return true when user has edit permission', () => {
      roleStore.roles = [mockRoleWithAllStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_edit')).toBe(true)
    })

    it('should return false when user lacks edit permission', () => {
      roleStore.roles = [mockRoleWithViewOnlyPermission]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_edit')).toBe(false)
    })

    it('should return false for basic user without permissions', () => {
      roleStore.roles = [mockRoleWithNoStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_edit')).toBe(false)
    })
  })

  describe('storage_locations_delete permission', () => {
    it('should return true when user has delete permission', () => {
      roleStore.roles = [mockRoleWithAllStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_delete')).toBe(true)
    })

    it('should return false when user lacks delete permission', () => {
      roleStore.roles = [mockRoleWithViewOnlyPermission]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_delete')).toBe(false)
    })

    it('should return false when role has no storage permissions', () => {
      roleStore.roles = [mockRoleWithNoStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_delete')).toBe(false)
    })
  })

  describe('Multiple storage permissions check', () => {
    it('should handle user with multiple storage permissions', () => {
      const roleWithMixedPermissions = {
        ...mockRoleWithAllStoragePermissions,
        permissions: [
          'storage_locations_view',
          'storage_locations_edit'
        ]
      }
      roleStore.roles = [roleWithMixedPermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(true)
      expect(hasPermission('storage_locations_create')).toBe(false)
      expect(hasPermission('storage_locations_edit')).toBe(true)
      expect(hasPermission('storage_locations_delete')).toBe(false)
    })

    it('should return false for all permissions when user has no role', () => {
      userProfilesStore.users = [{
        ...mockUserProfile,
        roleId: null as any
      }]
      roleStore.roles = [mockRoleWithAllStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(false)
      expect(hasPermission('storage_locations_create')).toBe(false)
      expect(hasPermission('storage_locations_edit')).toBe(false)
      expect(hasPermission('storage_locations_delete')).toBe(false)
    })

    it('should return false when user has invalid role ID', () => {
      userProfilesStore.users = [{
        ...mockUserProfile,
        roleId: 999
      }]
      roleStore.roles = [mockRoleWithAllStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(false)
      expect(hasPermission('storage_locations_create')).toBe(false)
    })
  })

  describe('Storage locations with other permissions', () => {
    it('should handle user with both storage and corporation permissions', () => {
      const roleWithMixedPermissions = {
        ...mockRoleWithAllStoragePermissions,
        permissions: [
          'storage_locations_view',
          'storage_locations_create',
          'corporations_view',
          'corporations_edit'
        ]
      }
      roleStore.roles = [roleWithMixedPermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(true)
      expect(hasPermission('storage_locations_create')).toBe(true)
      expect(hasPermission('corporations_view')).toBe(true)
      expect(hasPermission('corporations_edit')).toBe(true)
    })

    it('should correctly distinguish between different permission types', () => {
      const roleWithSpecificPermissions = {
        ...mockRoleWithAllStoragePermissions,
        permissions: [
          'storage_locations_view',
          'corporations_view'
        ]
      }
      roleStore.roles = [roleWithSpecificPermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(true)
      expect(hasPermission('storage_locations_create')).toBe(false)
      expect(hasPermission('corporations_view')).toBe(true)
      expect(hasPermission('corporations_create')).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should handle user with no email', () => {
      authStore.user = { ...mockUser, email: '' }
      roleStore.roles = [mockRoleWithAllStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(false)
    })

    it('should handle empty permissions array', () => {
      roleStore.roles = [{
        ...mockRoleWithAllStoragePermissions,
        permissions: []
      }]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(false)
      expect(hasPermission('storage_locations_create')).toBe(false)
      expect(hasPermission('storage_locations_edit')).toBe(false)
      expect(hasPermission('storage_locations_delete')).toBe(false)
    })

    it('should handle null permissions', () => {
      roleStore.roles = [{
        ...mockRoleWithAllStoragePermissions,
        permissions: null as any
      }]
      
      const { hasPermission } = usePermissions()
      
      expect(hasPermission('storage_locations_view')).toBe(false)
    })

    it('should handle inactive role', () => {
      roleStore.roles = [{
        ...mockRoleWithAllStoragePermissions,
        status: 'inactive'
      }]
      
      const { hasPermission } = usePermissions()
      
      // Permission check should still work regardless of role status
      // (status check should be handled separately if needed)
      expect(hasPermission('storage_locations_view')).toBe(true)
    })
  })

  describe('Permission naming consistency', () => {
    it('should use underscore format for storage_locations permissions', () => {
      roleStore.roles = [mockRoleWithAllStoragePermissions]
      
      const { hasPermission } = usePermissions()
      
      // Verify underscore format is used
      expect(hasPermission('storage_locations_view')).toBe(true)
      expect(hasPermission('storage_locations_create')).toBe(true)
      expect(hasPermission('storage_locations_edit')).toBe(true)
      expect(hasPermission('storage_locations_delete')).toBe(true)
      
      // Verify incorrect formats don't work
      expect(hasPermission('storageLocations.view')).toBe(false)
      expect(hasPermission('storage-locations-view')).toBe(false)
    })

    it('should maintain consistency with other module permissions', () => {
      const roleWithVariousPermissions = {
        ...mockRoleWithAllStoragePermissions,
        permissions: [
          'storage_locations_view',
          'corporations_view',
          'users_view',
          'roles_view'
        ]
      }
      roleStore.roles = [roleWithVariousPermissions]
      
      const { hasPermission } = usePermissions()
      
      // All permissions should follow the same naming pattern
      expect(hasPermission('storage_locations_view')).toBe(true)
      expect(hasPermission('corporations_view')).toBe(true)
      expect(hasPermission('users_view')).toBe(true)
      expect(hasPermission('roles_view')).toBe(true)
    })
  })
})

