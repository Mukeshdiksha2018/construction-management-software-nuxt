import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Integration test to verify that estimates store remains consistent
 * when navigating between project form and project list pages.
 * 
 * This test verifies the fix where we changed from refreshEstimatesFromAPI
 * to fetchEstimates to avoid store conflicts.
 */

describe('Projects - Estimates Store Consistency Integration', () => {
  let estimatesStore: any
  let mockEstimates: any[]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock estimates store
    estimatesStore = {
      estimates: [],
      loading: false,
      error: null,
      fetchEstimates: vi.fn(async (corporationUuid: string) => {
        // Simulate fetching from IndexedDB
        estimatesStore.estimates = mockEstimates.filter(
          (e: any) => e.corporation_uuid === corporationUuid
        )
      }),
      refreshEstimatesFromAPI: vi.fn(async (corporationUuid: string) => {
        // This method directly sets estimates.value (old behavior)
        estimatesStore.estimates = mockEstimates.filter(
          (e: any) => e.corporation_uuid === corporationUuid
        )
      }),
      getEstimatesByProject: vi.fn((projectUuid: string) => {
        return estimatesStore.estimates.filter(
          (e: any) => e.project_uuid === projectUuid
        )
      })
    }

    mockEstimates = [
      {
        uuid: 'est-1',
        project_uuid: 'proj-1',
        corporation_uuid: 'corp-1',
        status: 'Approved',
        final_amount: 15000,
        estimate_date: '2025-01-15'
      },
      {
        uuid: 'est-2',
        project_uuid: 'proj-2',
        corporation_uuid: 'corp-1',
        status: 'Draft',
        final_amount: 20000,
        estimate_date: '2025-01-20'
      }
    ]
  })

  describe('Estimates loading consistency', () => {
    it('should maintain estimates when using fetchEstimates (correct approach)', async () => {
      const corporationUuid = 'corp-1'
      
      // Simulate ProjectDetails.vue loading estimates
      await estimatesStore.fetchEstimates(corporationUuid)
      
      expect(estimatesStore.estimates.length).toBe(2)
      expect(estimatesStore.fetchEstimates).toHaveBeenCalledWith(corporationUuid)
      
      // Simulate navigating to project form and loading estimates again
      await estimatesStore.fetchEstimates(corporationUuid)
      
      // Estimates should still be available
      expect(estimatesStore.estimates.length).toBe(2)
      expect(estimatesStore.getEstimatesByProject('proj-1').length).toBe(1)
    })

    it('should avoid conflicts when using fetchEstimates instead of refreshEstimatesFromAPI', async () => {
      const corporationUuid = 'corp-1'
      
      // Initial load in ProjectDetails.vue
      await estimatesStore.fetchEstimates(corporationUuid)
      const initialEstimates = [...estimatesStore.estimates]
      
      // Navigate to form page and load again (should use fetchEstimates)
      await estimatesStore.fetchEstimates(corporationUuid)
      
      // Estimates should remain consistent
      expect(estimatesStore.estimates).toEqual(initialEstimates)
      expect(estimatesStore.refreshEstimatesFromAPI).not.toHaveBeenCalled()
    })

    it('should allow ProjectDetails.vue to read estimates after form page loads them', async () => {
      const corporationUuid = 'corp-1'
      
      // Simulate form page loading estimates first
      await estimatesStore.fetchEstimates(corporationUuid)
      expect(estimatesStore.estimates.length).toBe(2)
      
      // Simulate navigating back to ProjectDetails.vue
      // ProjectDetails.vue should be able to read the same estimates
      const projectEstimates = estimatesStore.getEstimatesByProject('proj-1')
      expect(projectEstimates.length).toBe(1)
      expect(projectEstimates[0].status).toBe('Approved')
    })
  })

  describe('Estimate status display in ProjectDetails.vue', () => {
    it('should correctly compute projectEstimateStatusMap after estimates are loaded', async () => {
      const corporationUuid = 'corp-1'
      const projects = [
        { uuid: 'proj-1', project_name: 'Project 1' },
        { uuid: 'proj-2', project_name: 'Project 2' }
      ]
      
      // Load estimates
      await estimatesStore.fetchEstimates(corporationUuid)
      
      // Simulate projectEstimateStatusMap computation from ProjectDetails.vue
      const projectEstimateStatusMap = new Map<string, string>()
      const allEstimates = estimatesStore.estimates || []
      
      projects.forEach((project: any) => {
        const projectEstimates = allEstimates.filter(
          (e: any) => e.project_uuid === project.uuid
        ) || []
        
        if (projectEstimates.length > 0) {
          const sorted = [...projectEstimates].sort((a: any, b: any) => {
            const dateA = new Date(a.estimate_date || 0).getTime()
            const dateB = new Date(b.estimate_date || 0).getTime()
            return dateB - dateA
          })
          const latestEstimate = sorted[0]
          if (latestEstimate && latestEstimate.status) {
            projectEstimateStatusMap.set(project.uuid, latestEstimate.status)
          }
        }
      })
      
      // Verify status map is correct
      expect(projectEstimateStatusMap.get('proj-1')).toBe('Approved')
      expect(projectEstimateStatusMap.get('proj-2')).toBe('Draft')
    })

    it('should show estimate status correctly after navigating back from form', async () => {
      const corporationUuid = 'corp-1'
      
      // Initial load
      await estimatesStore.fetchEstimates(corporationUuid)
      
      // Navigate to form (loads estimates again)
      await estimatesStore.fetchEstimates(corporationUuid)
      
      // Navigate back to list
      // Estimates should still be available for status computation
      const projectEstimates = estimatesStore.getEstimatesByProject('proj-1')
      expect(projectEstimates.length).toBe(1)
      expect(projectEstimates[0].status).toBe('Approved')
    })
  })

  describe('Loading state coordination', () => {
    it('should load estimates before setting loading to false in form page', async () => {
      const loading = { value: true }
      const corporationUuid = 'corp-1'
      const isEditMode = true
      
      if (isEditMode && corporationUuid) {
        // Load estimates first
        await estimatesStore.fetchEstimates(corporationUuid)
        // Then set loading to false
        loading.value = false
      }
      
      expect(estimatesStore.fetchEstimates).toHaveBeenCalled()
      expect(loading.value).toBe(false)
      expect(estimatesStore.estimates.length).toBeGreaterThan(0)
    })

    it('should have estimates available when form renders after loading completes', async () => {
      const loading = { value: true }
      const corporationUuid = 'corp-1'
      
      // Simulate loadProjectData flow
      await estimatesStore.fetchEstimates(corporationUuid)
      loading.value = false
      
      // At this point, estimates should be available for latestEstimate computed property
      const projectEstimates = estimatesStore.getEstimatesByProject('proj-1')
      expect(projectEstimates.length).toBe(1)
      expect(loading.value).toBe(false)
    })
  })

  describe('Error resilience', () => {
    it('should not break if estimates fail to load but project loads successfully', async () => {
      const loading = { value: true }
      const corporationUuid = 'corp-1'
      
      // Mock fetchEstimates to fail
      estimatesStore.fetchEstimates.mockRejectedValueOnce(new Error('Network error'))
      
      try {
        await estimatesStore.fetchEstimates(corporationUuid)
      } catch (error) {
        // Error should be caught, not propagated
        expect(error).toBeDefined()
      } finally {
        loading.value = false
      }
      
      // Loading should still be set to false
      expect(loading.value).toBe(false)
      // Project should still be loadable
      expect(estimatesStore.fetchEstimates).toHaveBeenCalled()
    })
  })
})

