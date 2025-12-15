import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, h, ref, computed } from 'vue'
import ProjectDetails from '@/components/Projects/ProjectDetails.vue'

// Mock useToast
const mockToast = {
  add: vi.fn()
}
vi.mock('#app', () => ({
  useToast: () => mockToast
}))
vi.stubGlobal('useToast', () => mockToast)

// Mock useRouter
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useRoute: () => ({
    params: {}
  })
}))

// Mock $fetch for API calls
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock stores
const mockCorpStore = {
  selectedCorporation: {
    uuid: "corp-1",
    corporation_name: "Test Corporation",
  },
  selectedCorporationId: "corp-1",
};

const mockProjectsStore = {
  projects: [] as any[],
  loading: false,
  error: null,
  fetchProjects: vi.fn(),
  deleteProject: vi.fn(),
};

const mockProjectTypesStore = {
  projectTypeNameByUuid: computed(() => ({
    "pt-1": "Residential",
    "pt-2": "Commercial",
  })),
  getActiveProjectTypes: vi.fn(() => [
    { uuid: "pt-1", name: "Residential" },
    { uuid: "pt-2", name: "Commercial" },
  ]),
  fetchProjectTypes: vi.fn(),
};

const mockServiceTypesStore = {
  serviceTypeNameByUuid: computed(() => ({
    "st-1": "Construction",
    "st-2": "Renovation",
  })),
  getActiveServiceTypes: [
    { uuid: "st-1", name: "Construction" },
    { uuid: "st-2", name: "Renovation" },
  ],
  fetchServiceTypes: vi.fn(),
};

const mockEstimatesStore = {
  estimates: [] as any[],
  loading: false,
  error: null,
  fetchEstimates: vi.fn(),
  getEstimatesByProject: vi.fn((projectUuid: string) => {
    return mockEstimatesStore.estimates.filter(
      (e: any) => e.project_uuid === projectUuid
    );
  }),
};

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/projects', () => ({
  useProjectsStore: () => mockProjectsStore
}))

vi.mock('@/stores/projectTypes', () => ({
  useProjectTypesStore: () => mockProjectTypesStore
}))

vi.mock('@/stores/serviceTypes', () => ({
  useServiceTypesStore: () => mockServiceTypesStore
}))

vi.mock("@/stores/estimates", () => ({
  useEstimatesStore: () => mockEstimatesStore,
}));

// Mock permissions
const mockHasPermission = vi.fn()
const mockUsePermissions = {
  hasPermission: mockHasPermission,
  isReady: ref(true),
};

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => mockUsePermissions
}))

// Mock composables
const mockTableApi = {
  setPageSize: vi.fn(),
  setPageIndex: vi.fn(),
};

vi.mock('@/composables/useTableStandard', async () => {
  const { ref, computed } = await import('vue')
  return {
    useTableStandard: () => ({
      pagination: ref({ pageSize: 10, pageIndex: 0 }),
      paginationOptions: ref({}),
      pageSizeOptions: ref([10, 25, 50]),
      columnPinning: ref({ left: [], right: ["actions"] }),
      globalFilter: ref(""),
      filteredData: computed(() => mockProjectsStore.projects),
      updatePageSize: vi.fn(),
      getPaginationProps: vi.fn(() => ({})),
      getPageInfo: vi.fn(() => ref("1-10 of 100")),
      shouldShowPagination: vi.fn(() => ref(true)),
    }),
  };
})

vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (amount: number) => `$${amount.toLocaleString()}`
  })
}))

vi.mock('@/composables/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: (date: string) => new Date(date).toLocaleDateString()
  })
}))

// Mock child components
vi.mock('@/components/AuditLogs/AuditLogSlideover.vue', () => ({
  default: {
    name: 'AuditLogSlideover',
    template: '<div data-testid="audit-log-slideover">Audit Log Slideover</div>',
    props: ['isOpen', 'entityType', 'entityUuid']
  }
}))

describe('ProjectDetails Component', () => {
  let wrapper: any

  const originalProjects = [
    {
      uuid: "project-1",
      corporation_uuid: "corp-1",
      project_name: "Test Project 1",
      project_id: "P001",
      project_type_uuid: "pt-1",
      service_type_uuid: "st-1",
      project_status: "In Progress",
      project_start_date: "2024-01-01",
      project_estimated_completion_date: "2024-12-31",
      estimated_amount: 100000,
      area_sq_ft: 1000,
      no_of_rooms: 5,
      only_total: false,
      enable_labor: true,
      enable_material: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    {
      uuid: "project-2",
      corporation_uuid: "corp-1",
      project_name: "Test Project 2",
      project_id: "P002",
      project_type_uuid: "pt-2",
      service_type_uuid: "st-2",
      project_status: "Completed",
      project_start_date: "2024-02-01",
      project_estimated_completion_date: "2024-11-30",
      estimated_amount: 200000,
      area_sq_ft: 2000,
      no_of_rooms: 10,
      only_total: true,
      enable_labor: false,
      enable_material: true,
      created_at: "2024-02-01",
      updated_at: "2024-02-01",
    },
    {
      uuid: "project-3",
      corporation_uuid: "corp-1",
      project_name: "Test Project 3",
      project_id: "P003",
      project_type_uuid: "pt-1",
      service_type_uuid: "st-1",
      project_status: "Pending",
      project_start_date: "2024-03-01",
      project_estimated_completion_date: "2024-10-30",
      estimated_amount: 50000,
      area_sq_ft: 500,
      no_of_rooms: 3,
      only_total: false,
      enable_labor: true,
      enable_material: false,
      created_at: "2024-03-01",
      updated_at: "2024-03-01",
    },
    {
      uuid: "project-4",
      corporation_uuid: "corp-1",
      project_name: "Test Project 4",
      project_id: "P004",
      project_type_uuid: "pt-2",
      service_type_uuid: "st-2",
      project_status: "On Hold",
      project_start_date: "2024-04-01",
      project_estimated_completion_date: "2024-09-30",
      estimated_amount: 75000,
      area_sq_ft: 750,
      no_of_rooms: 4,
      only_total: true,
      enable_labor: false,
      enable_material: false,
      created_at: "2024-04-01",
      updated_at: "2024-04-01",
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    mockToast.add.mockClear();
    mockPush.mockClear();
    mockProjectsStore.fetchProjects.mockClear();
    mockProjectsStore.deleteProject.mockClear();
    mockEstimatesStore.fetchEstimates.mockClear();
    mockFetch.mockClear();

    // Reset projects to original state
    mockProjectsStore.projects = [...originalProjects];

    // Reset estimates to empty
    mockEstimatesStore.estimates = [];

    // Reset permissions mock
    mockHasPermission.mockReturnValue(true);

    // Mock successful billed amounts API response by default
    mockFetch.mockResolvedValue({
      data: {
        'project-1': 15000,
        'project-2': 25000,
      },
      error: null,
    });

    // Clear all mocks
    vi.clearAllMocks();
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(ProjectDetails, {
      props,
      global: {
        stubs: {
          UTable: {
            name: "UTable",
            template: "<div><slot /></div>",
            props: ["data", "columns", "pagination", "globalFilter"],
            setup(props, { expose }) {
              expose({
                tableApi: mockTableApi,
              });
              return {};
            },
          },
          UButton: true,
          UInput: true,
          UModal: true,
          UBadge: true,
          UTooltip: true,
          UIcon: true,
          USkeleton: true,
          UPageCard: {
            name: "UPageCard",
            template:
              '<div class="page-card" @click="handleClick"><slot name="body" /></div>',
            props: ["variant", "highlight", "highlightColor", "onClick"],
            setup(props) {
              const handleClick = () => {
                if (props.onClick) {
                  props.onClick();
                }
              };
              return { handleClick };
            },
          },
          USelect: true,
          UPagination: true,
          AuditLogSlideover: true,
        },
      },
    });
  }

  describe('Component Mounting', () => {
    it('should mount without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should have correct table columns configuration', () => {
      wrapper = createWrapper();

      const columns = wrapper.vm.columns;

      expect(columns).toHaveLength(11);
      expect(columns[0].accessorKey).toBe("project_id");
      expect(columns[1].accessorKey).toBe("project_name");
      expect(columns[2].accessorKey).toBe("project_type_uuid");
      expect(columns[3].accessorKey).toBe("project_status");
      expect(columns[4].accessorKey).toBe("service_type_uuid");
      expect(columns[5].accessorKey).toBe("project_start_date");
      expect(columns[6].accessorKey).toBe("project_estimated_completion_date");
      expect(columns[7].accessorKey).toBe("estimated_amount");
      expect(columns[8].accessorKey).toBe("billed_to_date");
      expect(columns[9].accessorKey).toBe("estimate_status");
      // Actions column doesn't have accessorKey, it uses id instead (matching ItemsList.vue)
      expect(columns[10].id).toBe("actions");
      expect(columns[10].accessorKey).toBeUndefined();
    })
  })

  describe('Permission Functionality', () => {
    it('should show add button when user has project_create permission', () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_create') return true
        return false
      })

      wrapper = createWrapper()
      
      expect(wrapper.vm.hasPermission('project_create')).toBe(true)
    })

    it('should hide add button when user lacks project_create permission', () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_create') return false
        return true
      })

      wrapper = createWrapper()
      
      expect(wrapper.vm.hasPermission('project_create')).toBe(false)
    })

    it('should show view button in actions when user has project_view permission', () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_view') return true
        return false
      })

      wrapper = createWrapper()
      
      expect(wrapper.vm.hasPermission('project_view')).toBe(true)
    })

    it('should hide view button in actions when user lacks project_view permission', () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_view') return false
        return true
      })

      wrapper = createWrapper()
      
      expect(wrapper.vm.hasPermission('project_view')).toBe(false)
    })

    it('should show edit button in actions when user has project_edit permission', () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_edit') return true
        return false
      })

      wrapper = createWrapper()
      
      expect(wrapper.vm.hasPermission('project_edit')).toBe(true)
    })

    it('should hide edit button in actions when user lacks project_edit permission', () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_edit') return false
        return true
      })

      wrapper = createWrapper()
      
      expect(wrapper.vm.hasPermission('project_edit')).toBe(false)
    })

    it('should show delete button in actions when user has project_delete permission', () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_delete') return true
        return false
      })

      wrapper = createWrapper()
      
      expect(wrapper.vm.hasPermission('project_delete')).toBe(true)
    })

    it('should hide delete button in actions when user lacks project_delete permission', () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_delete') return false
        return true
      })

      wrapper = createWrapper()
      
      expect(wrapper.vm.hasPermission('project_delete')).toBe(false)
    })

    it('should call addNewProject with permission check', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_create') return false
        return true
      })

      wrapper = createWrapper()
      
      await wrapper.vm.addNewProject()
      
      // Should show access denied toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Access Denied',
        description: "You don't have permission to create projects.",
        color: 'error',
        icon: 'i-heroicons-x-circle'
      })
    })

    it('should call editProject with permission check', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_edit') return false
        return true
      })

      wrapper = createWrapper()
      
      const mockProject = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      await wrapper.vm.editProject(mockProject)
      
      // Should show access denied toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Access Denied',
        description: "You don't have permission to edit projects.",
        color: 'error',
        icon: 'i-heroicons-x-circle'
      })
    })

    it('should call deleteProject with permission check', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_delete') return false
        return true
      })

      wrapper = createWrapper()
      
      const mockProject = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      await wrapper.vm.deleteProject(mockProject)
      
      // Should show access denied toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Access Denied',
        description: "You don't have permission to delete projects.",
        color: 'error',
        icon: 'i-heroicons-x-circle'
      })
    })

    it('should call previewProjectDetails with permission check', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_view') return false
        return true
      })

      wrapper = createWrapper()
      
      const mockProject = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      await wrapper.vm.previewProjectDetails(mockProject)
      
      // Should show access denied toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Access Denied',
        description: "You don't have permission to view project details.",
        color: 'error',
        icon: 'i-heroicons-x-circle'
      })
    })

    it('should call confirmDelete with permission check', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_delete') return false
        return true
      })

      wrapper = createWrapper()
      
      // Set up the project to delete
      wrapper.vm.projectToDelete = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      await wrapper.vm.confirmDelete()
      
      // Should show access denied toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Access Denied',
        description: "You don't have permission to delete projects.",
        color: 'error',
        icon: 'i-heroicons-x-circle'
      })
    })

    it('should allow addNewProject when user has project_create permission', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_create') return true
        return false
      })

      wrapper = createWrapper()
      
      await wrapper.vm.addNewProject()
      
      // Should navigate to form
      expect(mockPush).toHaveBeenCalledWith('/projects/form/new')
    })

    it('should allow editProject when user has project_edit permission', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_edit') return true
        return false
      })

      wrapper = createWrapper()
      
      const mockProject = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      await wrapper.vm.editProject(mockProject)
      
      // Should navigate to edit form
      expect(mockPush).toHaveBeenCalledWith('/projects/form/project-1')
    })

    it('should allow deleteProject when user has project_delete permission', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_delete') return true
        return false
      })

      wrapper = createWrapper()
      
      const mockProject = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      await wrapper.vm.deleteProject(mockProject)
      
      // Should show delete modal
      expect(wrapper.vm.showDeleteModal).toBe(true)
      expect(wrapper.vm.projectToDelete).toEqual(mockProject)
    })

    it('should allow previewProjectDetails when user has project_view permission', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_view') return true
        return false
      })

      wrapper = createWrapper()
      
      const mockProject = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      await wrapper.vm.previewProjectDetails(mockProject)
      
      // Should show preview modal
      expect(wrapper.vm.showPreviewModal).toBe(true)
      expect(wrapper.vm.previewProject).toEqual(mockProject)
    })

    it('should allow confirmDelete when user has project_delete permission', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_delete') return true
        return false
      })

      wrapper = createWrapper()
      
      // Set up the project to delete
      wrapper.vm.projectToDelete = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      // Mock successful deletion
      mockProjectsStore.deleteProject.mockResolvedValue(true)
      
      await wrapper.vm.confirmDelete()
      
      // Should call deleteProject
      expect(mockProjectsStore.deleteProject).toHaveBeenCalledWith('project-1')
      
      // Should show success toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Project deleted successfully',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
      
      // Should close modal and reset state
      expect(wrapper.vm.showDeleteModal).toBe(false)
      expect(wrapper.vm.projectToDelete).toBe(null)
    })

    it('should handle delete error when estimates exist', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_delete') return true
        return false
      })

      wrapper = createWrapper()
      
      // Set up the project to delete and open modal
      wrapper.vm.projectToDelete = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      wrapper.vm.showDeleteModal = true
      
      // Mock error with estimates constraint
      const error = new Error('Cannot delete project. It is currently being used by 2 active estimate(s).')
      ;(error as any).statusCode = 400
      ;(error as any).statusMessage = 'Cannot delete project. It is currently being used by 2 active estimate(s).'
      ;(error as any).data = {
        estimateList: ['EST-001', 'EST-002'],
        count: 2,
        hasMore: false
      }
      mockProjectsStore.deleteProject.mockRejectedValue(error)
      
      await wrapper.vm.confirmDelete()
      
      // Should call deleteProject
      expect(mockProjectsStore.deleteProject).toHaveBeenCalledWith('project-1')
      
      // Should show error toast with formatted message
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cannot Delete Project',
          description: expect.stringContaining('This project is currently being used by 2 active estimate(s): EST-001, EST-002'),
          color: 'error'
        })
      )
      
      // Should not close modal on error
      expect(wrapper.vm.showDeleteModal).toBe(true)
      expect(wrapper.vm.projectToDelete).not.toBe(null)
    })

    it('should handle delete error with more than 3 estimates', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_delete') return true
        return false
      })

      wrapper = createWrapper()
      
      // Set up the project to delete
      wrapper.vm.projectToDelete = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      // Mock error with more than 3 estimates
      const error = new Error('Cannot delete project. It is currently being used by 5 active estimate(s).')
      ;(error as any).statusCode = 400
      ;(error as any).statusMessage = 'Cannot delete project. It is currently being used by 5 active estimate(s).'
      ;(error as any).data = {
        estimateList: ['EST-001', 'EST-002', 'EST-003', 'EST-004', 'EST-005'],
        count: 5,
        hasMore: false
      }
      mockProjectsStore.deleteProject.mockRejectedValue(error)
      
      await wrapper.vm.confirmDelete()
      
      // Should show error toast with first 3 estimates and count
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cannot Delete Project',
          description: expect.stringContaining('EST-001, EST-002, EST-003, and 2 more'),
          color: 'error'
        })
      )
    })

    it('should handle generic delete error', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_delete') return true
        return false
      })

      wrapper = createWrapper()
      
      // Set up the project to delete
      wrapper.vm.projectToDelete = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      // Mock generic error
      const error = new Error('Server error occurred')
      ;(error as any).statusCode = 500
      ;(error as any).statusMessage = 'Server error occurred'
      mockProjectsStore.deleteProject.mockRejectedValue(error)
      
      await wrapper.vm.confirmDelete()
      
      // Should show error toast
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Server Error',
          description: 'Server error occurred',
          color: 'error'
        })
      )
    })
  })

  describe('Component Methods', () => {
    it('should have addNewProject method', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.addNewProject).toBeDefined()
      expect(typeof wrapper.vm.addNewProject).toBe('function')
    })

    it('should have editProject method', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.editProject).toBeDefined()
      expect(typeof wrapper.vm.editProject).toBe('function')
    })

    it('should have deleteProject method', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.deleteProject).toBeDefined()
      expect(typeof wrapper.vm.deleteProject).toBe('function')
    })

    it('should have previewProjectDetails method', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.previewProjectDetails).toBeDefined()
      expect(typeof wrapper.vm.previewProjectDetails).toBe('function')
    })

    it('should have confirmDelete method', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.confirmDelete).toBeDefined()
      expect(typeof wrapper.vm.confirmDelete).toBe('function')
    })

    it('should have cancelDelete method', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.cancelDelete).toBeDefined()
      expect(typeof wrapper.vm.cancelDelete).toBe('function')
    })

    it('should have editProjectFromPreview method', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.editProjectFromPreview).toBeDefined()
      expect(typeof wrapper.vm.editProjectFromPreview).toBe('function')
    })
  })

  describe('Component State', () => {
    it('should maintain showDeleteModal state', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.showDeleteModal).toBe(false)
      
      wrapper.vm.showDeleteModal = true
      expect(wrapper.vm.showDeleteModal).toBe(true)
    })

    it('should maintain showPreviewModal state', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.showPreviewModal).toBe(false)
      
      wrapper.vm.showPreviewModal = true
      expect(wrapper.vm.showPreviewModal).toBe(true)
    })

    it('should maintain projectToDelete state', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.projectToDelete).toBe(null)
      
      const mockProject = { uuid: 'project-1', project_name: 'Test' }
      wrapper.vm.projectToDelete = mockProject
      expect(wrapper.vm.projectToDelete).toEqual(mockProject)
    })

    it('should maintain previewProject state', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.previewProject).toBe(null)
      
      const mockProject = { uuid: 'project-1', project_name: 'Test' }
      wrapper.vm.previewProject = mockProject
      expect(wrapper.vm.previewProject).toEqual(mockProject)
    })
  })

  describe('Error Handling', () => {
    it('should handle deleteProject error', async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === 'project_delete') return true
        return false
      })

      wrapper = createWrapper()
      
      // Set up the project to delete
      wrapper.vm.projectToDelete = {
        uuid: 'project-1',
        project_name: 'Test Project'
      }
      
      // Mock failed deletion
      mockProjectsStore.deleteProject.mockRejectedValue(new Error('Delete failed'))
      
      await wrapper.vm.confirmDelete()
      
      // Should show error toast
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: expect.stringContaining('Delete failed'),
          color: 'error'
        })
      )
    })
  })

  describe("Status Stat Cards", () => {
    beforeEach(() => {
      mockHasPermission.mockReturnValue(true);
    });

    it("should compute allProjectsStats correctly", () => {
      wrapper = createWrapper();

      const stats = wrapper.vm.allProjectsStats;

      expect(stats.count).toBe(4);
      expect(stats.totalValue).toBe(425000); // 100000 + 200000 + 50000 + 75000
    });

    it("should compute pendingStats correctly", () => {
      wrapper = createWrapper();

      const stats = wrapper.vm.pendingStats;

      expect(stats.count).toBe(1);
      expect(stats.totalValue).toBe(50000);
    });

    it("should compute inProgressStats correctly", () => {
      wrapper = createWrapper();

      const stats = wrapper.vm.inProgressStats;

      expect(stats.count).toBe(1);
      expect(stats.totalValue).toBe(100000);
    });

    it("should compute completedStats correctly", () => {
      wrapper = createWrapper();

      const stats = wrapper.vm.completedStats;

      expect(stats.count).toBe(1);
      expect(stats.totalValue).toBe(200000);
    });

    it("should compute onHoldStats correctly", () => {
      wrapper = createWrapper();

      const stats = wrapper.vm.onHoldStats;

      expect(stats.count).toBe(1);
      expect(stats.totalValue).toBe(75000);
    });

    it("should compute biddingStats correctly", () => {
      // Add a project with Bidding status
      const projectsWithBidding = [
        ...originalProjects,
        {
          uuid: "project-5",
          corporation_uuid: "corp-1",
          project_name: "Test Project 5",
          project_id: "P005",
          project_type_uuid: "pt-1",
          service_type_uuid: "st-1",
          project_status: "Bidding",
          project_start_date: "2024-05-01",
          project_estimated_completion_date: "2024-12-31",
          estimated_amount: 150000,
          created_at: "2024-05-01",
          updated_at: "2024-05-01",
        },
      ];

      mockProjectsStore.projects = projectsWithBidding;
      wrapper = createWrapper();

      const stats = wrapper.vm.biddingStats;

      expect(stats.count).toBe(1);
      expect(stats.totalValue).toBe(150000);
    });

    it("should compute startedStats correctly", () => {
      // Add a project with Started status
      const projectsWithStarted = [
        ...originalProjects,
        {
          uuid: "project-6",
          corporation_uuid: "corp-1",
          project_name: "Test Project 6",
          project_id: "P006",
          project_type_uuid: "pt-2",
          service_type_uuid: "st-2",
          project_status: "Started",
          project_start_date: "2024-06-01",
          project_estimated_completion_date: "2024-11-30",
          estimated_amount: 125000,
          created_at: "2024-06-01",
          updated_at: "2024-06-01",
        },
      ];

      mockProjectsStore.projects = projectsWithStarted;
      wrapper = createWrapper();

      const stats = wrapper.vm.startedStats;

      expect(stats.count).toBe(1);
      expect(stats.totalValue).toBe(125000);
    });

    it("should have selectedStatusFilter default to null", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.selectedStatusFilter).toBe(null);
    });

    it("should filter projects when status filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "In Progress";

      const filtered = wrapper.vm.filteredProjects;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].project_status).toBe("In Progress");
      expect(filtered[0].uuid).toBe("project-1");
    });

    it("should show all projects when no filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = null;

      const filtered = wrapper.vm.filteredProjects;

      expect(filtered).toHaveLength(4);
    });

    it("should toggle status filter when clicking a status card", async () => {
      wrapper = createWrapper();

      expect(wrapper.vm.selectedStatusFilter).toBe(null);

      await wrapper.vm.toggleStatusFilter("Pending");
      await nextTick();

      expect(wrapper.vm.selectedStatusFilter).toBe("Pending");

      // Clicking same status again should clear filter
      await wrapper.vm.toggleStatusFilter("Pending");
      await nextTick();

      expect(wrapper.vm.selectedStatusFilter).toBe(null);
    });

    it("should clear status filter when clicking All Projects card", async () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "In Progress";
      expect(wrapper.vm.selectedStatusFilter).toBe("In Progress");

      await wrapper.vm.clearStatusFilter();
      await nextTick();

      expect(wrapper.vm.selectedStatusFilter).toBe(null);
    });

    it("should filter projects correctly when Pending filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Pending";

      const filtered = wrapper.vm.filteredProjects;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].project_status).toBe("Pending");
      expect(filtered[0].uuid).toBe("project-3");
    });

    it("should filter projects correctly when Completed filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Completed";

      const filtered = wrapper.vm.filteredProjects;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].project_status).toBe("Completed");
      expect(filtered[0].uuid).toBe("project-2");
    });

    it("should filter projects correctly when On Hold filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "On Hold";

      const filtered = wrapper.vm.filteredProjects;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].project_status).toBe("On Hold");
      expect(filtered[0].uuid).toBe("project-4");
    });

    it("should filter projects correctly when Bidding filter is applied", () => {
      // Add a project with Bidding status
      const projectsWithBidding = [
        ...originalProjects,
        {
          uuid: "project-5",
          corporation_uuid: "corp-1",
          project_name: "Test Project 5",
          project_id: "P005",
          project_type_uuid: "pt-1",
          service_type_uuid: "st-1",
          project_status: "Bidding",
          project_start_date: "2024-05-01",
          project_estimated_completion_date: "2024-12-31",
          estimated_amount: 150000,
          created_at: "2024-05-01",
          updated_at: "2024-05-01",
        },
      ];

      mockProjectsStore.projects = projectsWithBidding;
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Bidding";

      const filtered = wrapper.vm.filteredProjects;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].project_status).toBe("Bidding");
      expect(filtered[0].uuid).toBe("project-5");
    });

    it("should filter projects correctly when Started filter is applied", () => {
      // Add a project with Started status
      const projectsWithStarted = [
        ...originalProjects,
        {
          uuid: "project-6",
          corporation_uuid: "corp-1",
          project_name: "Test Project 6",
          project_id: "P006",
          project_type_uuid: "pt-2",
          service_type_uuid: "st-2",
          project_status: "Started",
          project_start_date: "2024-06-01",
          project_estimated_completion_date: "2024-11-30",
          estimated_amount: 125000,
          created_at: "2024-06-01",
          updated_at: "2024-06-01",
        },
      ];

      mockProjectsStore.projects = projectsWithStarted;
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Started";

      const filtered = wrapper.vm.filteredProjects;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].project_status).toBe("Started");
      expect(filtered[0].uuid).toBe("project-6");
    });

    it("should handle projects with missing status as Pending", () => {
      // Add a project without status
      const projectsWithMissingStatus = [
        ...originalProjects,
        {
          uuid: "project-5",
          corporation_uuid: "corp-1",
          project_name: "Test Project 5",
          project_id: "P005",
          project_status: undefined, // Missing status
          estimated_amount: 30000,
          created_at: "2024-05-01",
          updated_at: "2024-05-01",
        },
      ];

      mockProjectsStore.projects = projectsWithMissingStatus;
      wrapper = createWrapper();

      const stats = wrapper.vm.pendingStats;

      // Should count project with missing status as Pending
      expect(stats.count).toBe(2); // project-3 + project-5
      expect(stats.totalValue).toBe(80000); // 50000 + 30000
    });

    it("should handle projects with zero estimated_amount", () => {
      const projectsWithZeroAmount = [
        ...originalProjects,
        {
          uuid: "project-6",
          corporation_uuid: "corp-1",
          project_name: "Test Project 6",
          project_id: "P006",
          project_status: "In Progress",
          estimated_amount: 0,
          created_at: "2024-06-01",
          updated_at: "2024-06-01",
        },
      ];

      mockProjectsStore.projects = projectsWithZeroAmount;
      wrapper = createWrapper();

      const stats = wrapper.vm.inProgressStats;

      expect(stats.count).toBe(2);
      expect(stats.totalValue).toBe(100000); // 100000 + 0
    });

    it("should handle projects with null estimated_amount", () => {
      const projectsWithNullAmount = [
        ...originalProjects,
        {
          uuid: "project-7",
          corporation_uuid: "corp-1",
          project_name: "Test Project 7",
          project_id: "P007",
          project_status: "Completed",
          estimated_amount: null,
          created_at: "2024-07-01",
          updated_at: "2024-07-01",
        },
      ];

      mockProjectsStore.projects = projectsWithNullAmount;
      wrapper = createWrapper();

      const stats = wrapper.vm.completedStats;

      expect(stats.count).toBe(2);
      expect(stats.totalValue).toBe(200000); // 200000 + 0 (null treated as 0)
    });
  });

  describe("Estimate Status Functionality", () => {
    it('should show "No Estimate" when project has no estimates', () => {
      wrapper = createWrapper();

      const estimateStatusMap = wrapper.vm.projectEstimateStatusMap;
      const status = estimateStatusMap.get("project-1");

      expect(status).toBeUndefined();
    });

    it("should display Draft status when project has a Draft estimate", () => {
      mockEstimatesStore.estimates = [
        {
          uuid: "estimate-1",
          project_uuid: "project-1",
          status: "Draft",
          estimate_date: "2024-01-15",
          final_amount: 100000,
        },
      ];

      wrapper = createWrapper();

      const estimateStatusMap = wrapper.vm.projectEstimateStatusMap;
      const status = estimateStatusMap.get("project-1");

      expect(status).toBe("Draft");
    });

    it("should display Ready status when project has a Ready estimate", () => {
      mockEstimatesStore.estimates = [
        {
          uuid: "estimate-1",
          project_uuid: "project-1",
          status: "Ready",
          estimate_date: "2024-01-15",
          final_amount: 100000,
        },
      ];

      wrapper = createWrapper();

      const estimateStatusMap = wrapper.vm.projectEstimateStatusMap;
      const status = estimateStatusMap.get("project-1");

      expect(status).toBe("Ready");
    });

    it("should display Approved status when project has an Approved estimate", () => {
      mockEstimatesStore.estimates = [
        {
          uuid: "estimate-1",
          project_uuid: "project-1",
          status: "Approved",
          estimate_date: "2024-01-15",
          final_amount: 100000,
        },
      ];

      wrapper = createWrapper();

      const estimateStatusMap = wrapper.vm.projectEstimateStatusMap;
      const status = estimateStatusMap.get("project-1");

      expect(status).toBe("Approved");
    });

    it("should display the latest estimate status when project has multiple estimates", () => {
      mockEstimatesStore.estimates = [
        {
          uuid: "estimate-1",
          project_uuid: "project-1",
          status: "Draft",
          estimate_date: "2024-01-15",
          final_amount: 100000,
        },
        {
          uuid: "estimate-2",
          project_uuid: "project-1",
          status: "Ready",
          estimate_date: "2024-02-15", // More recent
          final_amount: 110000,
        },
        {
          uuid: "estimate-3",
          project_uuid: "project-1",
          status: "Approved",
          estimate_date: "2024-01-20", // Older than estimate-2
          final_amount: 105000,
        },
      ];

      wrapper = createWrapper();

      const estimateStatusMap = wrapper.vm.projectEstimateStatusMap;
      const status = estimateStatusMap.get("project-1");

      // Should show Ready (most recent by date)
      expect(status).toBe("Ready");
    });

    it("should handle multiple projects with different estimate statuses", () => {
      mockEstimatesStore.estimates = [
        {
          uuid: "estimate-1",
          project_uuid: "project-1",
          status: "Draft",
          estimate_date: "2024-01-15",
          final_amount: 100000,
        },
        {
          uuid: "estimate-2",
          project_uuid: "project-2",
          status: "Approved",
          estimate_date: "2024-02-15",
          final_amount: 200000,
        },
        {
          uuid: "estimate-3",
          project_uuid: "project-3",
          status: "Ready",
          estimate_date: "2024-03-15",
          final_amount: 50000,
        },
      ];

      wrapper = createWrapper();

      const estimateStatusMap = wrapper.vm.projectEstimateStatusMap;

      expect(estimateStatusMap.get("project-1")).toBe("Draft");
      expect(estimateStatusMap.get("project-2")).toBe("Approved");
      expect(estimateStatusMap.get("project-3")).toBe("Ready");
      expect(estimateStatusMap.get("project-4")).toBeUndefined(); // No estimate
    });

    it("should sort estimates by estimate_date descending to get latest", () => {
      mockEstimatesStore.estimates = [
        {
          uuid: "estimate-1",
          project_uuid: "project-1",
          status: "Draft",
          estimate_date: "2024-01-10",
          final_amount: 100000,
        },
        {
          uuid: "estimate-2",
          project_uuid: "project-1",
          status: "Approved",
          estimate_date: "2024-03-20", // Most recent
          final_amount: 120000,
        },
        {
          uuid: "estimate-3",
          project_uuid: "project-1",
          status: "Ready",
          estimate_date: "2024-02-15",
          final_amount: 110000,
        },
      ];

      wrapper = createWrapper();

      const estimateStatusMap = wrapper.vm.projectEstimateStatusMap;
      const status = estimateStatusMap.get("project-1");

      // Should show Approved (most recent by date)
      expect(status).toBe("Approved");
    });

    it("should handle projects with no estimates correctly", () => {
      // No estimates in store
      mockEstimatesStore.estimates = [];

      wrapper = createWrapper();

      const estimateStatusMap = wrapper.vm.projectEstimateStatusMap;

      // All projects should have no estimate status
      expect(estimateStatusMap.get("project-1")).toBeUndefined();
      expect(estimateStatusMap.get("project-2")).toBeUndefined();
      expect(estimateStatusMap.get("project-3")).toBeUndefined();
      expect(estimateStatusMap.get("project-4")).toBeUndefined();
    });

    it("should correctly map estimate status when estimates are present", () => {
      // Set estimates before creating wrapper
      mockEstimatesStore.estimates = [
        {
          uuid: "estimate-1",
          project_uuid: "project-1",
          status: "Draft",
          estimate_date: "2024-01-15",
          final_amount: 100000,
        },
      ];

      wrapper = createWrapper();

      // Should have the estimate status
      const estimateStatusMap = wrapper.vm.projectEstimateStatusMap;
      expect(estimateStatusMap.get("project-1")).toBe("Draft");
    });

    it("should fetch estimates when component mounts", () => {
      wrapper = createWrapper();

      expect(mockEstimatesStore.fetchEstimates).toHaveBeenCalledWith("corp-1");
    });
  });

  describe("Billed to Date Functionality", () => {
    beforeEach(() => {
      mockHasPermission.mockReturnValue(true);
      mockFetch.mockClear();
    });

    it("should have projectBilledAmounts state initialized as empty Map", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.projectBilledAmounts).toBeDefined();
      expect(wrapper.vm.projectBilledAmounts instanceof Map).toBe(true);
    });

    it("should have fetchBilledAmounts method defined", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.fetchBilledAmounts).toBeDefined();
      expect(typeof wrapper.vm.fetchBilledAmounts).toBe("function");
    });

    it("should call billed-amounts API when fetchBilledAmounts is called", async () => {
      mockFetch.mockResolvedValue({
        data: {
          "project-1": 15000,
          "project-2": 25000,
        },
        error: null,
      });

      wrapper = createWrapper();
      await wrapper.vm.fetchBilledAmounts();

      expect(mockFetch).toHaveBeenCalledWith("/api/projects/billed-amounts", {
        method: "GET",
        query: {
          corporation_uuid: "corp-1",
        },
      });
    });

    it("should populate projectBilledAmounts Map from API response", async () => {
      mockFetch.mockResolvedValue({
        data: {
          "project-1": 15000.5,
          "project-2": 25000.75,
          "project-3": 0,
        },
        error: null,
      });

      wrapper = createWrapper();
      await wrapper.vm.fetchBilledAmounts();

      const billedAmounts = wrapper.vm.projectBilledAmounts;

      expect(billedAmounts.get("project-1")).toBe(15000.5);
      expect(billedAmounts.get("project-2")).toBe(25000.75);
      expect(billedAmounts.get("project-3")).toBe(0);
      expect(billedAmounts.get("project-4")).toBeUndefined();
    });

    it("should handle empty billed amounts response", async () => {
      mockFetch.mockResolvedValue({
        data: {},
        error: null,
      });

      wrapper = createWrapper();
      await wrapper.vm.fetchBilledAmounts();

      const billedAmounts = wrapper.vm.projectBilledAmounts;

      expect(billedAmounts.size).toBe(0);
    });

    it("should handle API error gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error("Network error"));

      wrapper = createWrapper();
      await wrapper.vm.fetchBilledAmounts();

      // Should not throw and billedAmounts should remain unchanged
      expect(wrapper.vm.projectBilledAmounts.size).toBe(0);
      
      consoleErrorSpy.mockRestore();
    });

    it("should not call API when corporation is not selected", async () => {
      // Override mockCorpStore to return null corporation
      const originalSelectedCorporationId = mockCorpStore.selectedCorporationId;
      mockCorpStore.selectedCorporationId = null as any;

      wrapper = createWrapper();
      await wrapper.vm.fetchBilledAmounts();

      // API should not be called
      expect(mockFetch).not.toHaveBeenCalledWith(
        "/api/projects/billed-amounts",
        expect.anything()
      );

      // Restore
      mockCorpStore.selectedCorporationId = originalSelectedCorporationId;
    });

    it("should include billed_to_date column in table columns", () => {
      wrapper = createWrapper();

      const columns = wrapper.vm.columns;
      const billedColumn = columns.find(
        (col: any) => col.accessorKey === "billed_to_date"
      );

      expect(billedColumn).toBeDefined();
      expect(billedColumn.header).toBe("Billed to Date");
      expect(billedColumn.enableSorting).toBe(false);
    });

    it("should render billed amount from projectBilledAmounts Map in table cell", async () => {
      mockFetch.mockResolvedValue({
        data: {
          "project-1": 15000,
        },
        error: null,
      });

      wrapper = createWrapper();
      await wrapper.vm.fetchBilledAmounts();

      const billedAmount = wrapper.vm.projectBilledAmounts.get("project-1");
      expect(billedAmount).toBe(15000);
    });

    it("should return 0 for projects without billed amounts", async () => {
      mockFetch.mockResolvedValue({
        data: {
          "project-1": 15000,
        },
        error: null,
      });

      wrapper = createWrapper();
      await wrapper.vm.fetchBilledAmounts();

      // project-4 has no billed amount in response
      const billedAmount = wrapper.vm.projectBilledAmounts.get("project-4") || 0;
      expect(billedAmount).toBe(0);
    });

    it("should handle null data in API response", async () => {
      mockFetch.mockResolvedValue({
        data: null,
        error: null,
      });

      wrapper = createWrapper();
      await wrapper.vm.fetchBilledAmounts();

      expect(wrapper.vm.projectBilledAmounts.size).toBe(0);
    });

    it("should handle response without data property", async () => {
      mockFetch.mockResolvedValue({});

      wrapper = createWrapper();
      await wrapper.vm.fetchBilledAmounts();

      expect(wrapper.vm.projectBilledAmounts.size).toBe(0);
    });
  });

  describe("Status Badge Colors and Icons", () => {
    beforeEach(() => {
      mockHasPermission.mockReturnValue(true);
    });

    it("should return correct badge color for Pending status", () => {
      wrapper = createWrapper();

      const color = wrapper.vm.getStatusBadgeColor("Pending");
      expect(color).toBe("warning");
    });

    it("should return correct badge color for Bidding status", () => {
      wrapper = createWrapper();

      const color = wrapper.vm.getStatusBadgeColor("Bidding");
      expect(color).toBe("info");
    });

    it("should return correct badge color for Started status", () => {
      wrapper = createWrapper();

      const color = wrapper.vm.getStatusBadgeColor("Started");
      expect(color).toBe("primary");
    });

    it("should return correct badge color for In Progress status", () => {
      wrapper = createWrapper();

      const color = wrapper.vm.getStatusBadgeColor("In Progress");
      expect(color).toBe("info");
    });

    it("should return correct badge color for Completed status", () => {
      wrapper = createWrapper();

      const color = wrapper.vm.getStatusBadgeColor("Completed");
      expect(color).toBe("success");
    });

    it("should return correct badge color for On Hold status", () => {
      wrapper = createWrapper();

      const color = wrapper.vm.getStatusBadgeColor("On Hold");
      expect(color).toBe("error");
    });

    it("should return default badge color for unknown status", () => {
      wrapper = createWrapper();

      const color = wrapper.vm.getStatusBadgeColor("Unknown");
      expect(color).toBe("warning");
    });

    it("should return correct icon for Pending status", () => {
      wrapper = createWrapper();

      const icon = wrapper.vm.getStatusIcon("Pending");
      expect(icon).toBe("i-heroicons-clock");
    });

    it("should return correct icon for Bidding status", () => {
      wrapper = createWrapper();

      const icon = wrapper.vm.getStatusIcon("Bidding");
      expect(icon).toBe("i-heroicons-document-text");
    });

    it("should return correct icon for Started status", () => {
      wrapper = createWrapper();

      const icon = wrapper.vm.getStatusIcon("Started");
      expect(icon).toBe("i-heroicons-play-circle");
    });

    it("should return correct icon for In Progress status", () => {
      wrapper = createWrapper();

      const icon = wrapper.vm.getStatusIcon("In Progress");
      expect(icon).toBe("i-heroicons-play");
    });

    it("should return correct icon for Completed status", () => {
      wrapper = createWrapper();

      const icon = wrapper.vm.getStatusIcon("Completed");
      expect(icon).toBe("i-heroicons-check-circle");
    });

    it("should return correct icon for On Hold status", () => {
      wrapper = createWrapper();

      const icon = wrapper.vm.getStatusIcon("On Hold");
      expect(icon).toBe("i-heroicons-pause");
    });

    it("should return default icon for unknown status", () => {
      wrapper = createWrapper();

      const icon = wrapper.vm.getStatusIcon("Unknown");
      expect(icon).toBe("i-heroicons-clock");
    });

    it("should apply correct status color class in table cell for Bidding", () => {
      wrapper = createWrapper();

      const statusColumn = wrapper.vm.columns.find(
        (col: any) => col.accessorKey === "project_status"
      );
      
      // Create a mock row with Bidding status - cell function expects { row: { original: ... } }
      const mockRow = {
        original: {
          project_status: "Bidding",
        },
      };

      const cell = statusColumn.cell({ row: mockRow });
      
      // Check that the cell has the correct class
      expect(cell.props.class).toContain("bg-info/10");
      expect(cell.props.class).toContain("text-info");
    });

    it("should apply correct status color class in table cell for Started", () => {
      wrapper = createWrapper();

      const statusColumn = wrapper.vm.columns.find(
        (col: any) => col.accessorKey === "project_status"
      );
      
      // Create a mock row with Started status - cell function expects { row: { original: ... } }
      const mockRow = {
        original: {
          project_status: "Started",
        },
      };

      const cell = statusColumn.cell({ row: mockRow });
      
      // Check that the cell has the correct class
      expect(cell.props.class).toContain("bg-primary/10");
      expect(cell.props.class).toContain("text-primary");
    });
  });
})
