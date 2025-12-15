import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Vue functions
vi.mock('vue', () => ({
  ref: (value: any) => ({ value }),
  computed: (fn: () => any) => ({ value: fn() }),
  h: vi.fn(),
  resolveComponent: vi.fn()
}))

// Mock TanStack table function
vi.mock('@tanstack/vue-table', () => ({
  getPaginationRowModel: () => vi.fn()
}))

// Import after mocks
const { useTableStandard, createSortableColumn, createActionColumn } = await import('../../../composables/useTableStandard')

describe('useTableStandard', () => {
  let tableStandard: ReturnType<typeof useTableStandard>

  beforeEach(() => {
    tableStandard = useTableStandard()
  })

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      expect(tableStandard.sorting.value).toEqual([])
      expect(tableStandard.pagination.value).toEqual({
        pageIndex: 0,
        pageSize: 10
      })
    })

    it('should provide pagination options', () => {
      expect(tableStandard.paginationOptions.value).toHaveProperty('getPaginationRowModel')
    })

    it('should provide page size options', () => {
      expect(tableStandard.pageSizeOptions).toEqual([
        { label: "10 per page", value: 10 },
        { label: "25 per page", value: 25 },
        { label: "50 per page", value: 50 },
        { label: "100 per page", value: 100 }
      ])
    })
  })

  describe('updatePageSize function', () => {
    it('should call setPageSize on table API when available', () => {
      const mockSetPageSize = vi.fn()
      const mockTable = {
        tableApi: {
          setPageSize: mockSetPageSize
        }
      }

      tableStandard.pagination.value.pageSize = 25
      tableStandard.updatePageSize(mockTable)

      expect(mockSetPageSize).toHaveBeenCalledWith(25)
    })

    it('should not throw when table API is not available', () => {
      const mockTable = { tableApi: null }
      
      expect(() => {
        tableStandard.updatePageSize(mockTable)
      }).not.toThrow()
    })

    it('should not throw when table is null', () => {
      expect(() => {
        tableStandard.updatePageSize(null)
      }).not.toThrow()
    })
  })

  describe('shouldShowPagination function', () => {
    it('should return computed function for ref input', () => {
      const dataLength = { value: 15 }
      const result = tableStandard.shouldShowPagination(dataLength)
      
      expect(result.value).toBe(true)
    })

    it('should return computed function for number input', () => {
      const result = tableStandard.shouldShowPagination(15)
      
      expect(result.value).toBe(true)
    })

    it('should return false for small datasets', () => {
      const result = tableStandard.shouldShowPagination(5)
      
      expect(result.value).toBe(false)
    })

    it('should return false for exactly 10 items', () => {
      const result = tableStandard.shouldShowPagination(10)
      
      expect(result.value).toBe(false)
    })

    it('should return true for more than 10 items', () => {
      const result = tableStandard.shouldShowPagination(11)
      
      expect(result.value).toBe(true)
    })
  })

  describe('getPaginationProps function', () => {
    it('should return correct pagination props', () => {
      const mockTable = {
        tableApi: {
          getState: () => ({
            pagination: { pageIndex: 2, pageSize: 25 }
          }),
          getFilteredRowModel: () => ({ rows: { length: 100 } }),
          setPageIndex: vi.fn()
        }
      }

      const props = tableStandard.getPaginationProps(mockTable, 'users')

      expect(props['default-page']).toBe(3) // pageIndex + 1
      expect(props['items-per-page']).toBe(25)
      expect(props.total).toBe(100)
    })

    it('should handle missing table API gracefully', () => {
      const props = tableStandard.getPaginationProps(null, 'items')

      expect(props['default-page']).toBe(1)
      expect(props['items-per-page']).toBeUndefined()
      expect(props.total).toBeUndefined()
    })

    it('should call setPageIndex when onUpdate:page is triggered', () => {
      const mockSetPageIndex = vi.fn()
      const mockTable = {
        tableApi: {
          getState: () => ({
            pagination: { pageIndex: 0, pageSize: 10 }
          }),
          getFilteredRowModel: () => ({ rows: { length: 50 } }),
          setPageIndex: mockSetPageIndex
        }
      }

      const props = tableStandard.getPaginationProps(mockTable)
      props['onUpdate:page'](3)

      expect(mockSetPageIndex).toHaveBeenCalledWith(2) // page - 1
    })
  })

  describe('getPageInfo function', () => {
    it('should return correct page info string', () => {
      const mockTable = {
        tableApi: {
          getState: () => ({
            pagination: { pageIndex: 1, pageSize: 10 }
          }),
          getFilteredRowModel: () => ({ rows: { length: 25 } })
        }
      }

      const pageInfo = tableStandard.getPageInfo(mockTable, 'users')

      expect(pageInfo.value).toBe('Showing 11 to 20 of 25 users')
    })

    it('should handle first page correctly', () => {
      const mockTable = {
        tableApi: {
          getState: () => ({
            pagination: { pageIndex: 0, pageSize: 10 }
          }),
          getFilteredRowModel: () => ({ rows: { length: 25 } })
        }
      }

      const pageInfo = tableStandard.getPageInfo(mockTable, 'items')

      expect(pageInfo.value).toBe('Showing 1 to 10 of 25 items')
    })

    it('should handle last page correctly when not full', () => {
      const mockTable = {
        tableApi: {
          getState: () => ({
            pagination: { pageIndex: 2, pageSize: 10 }
          }),
          getFilteredRowModel: () => ({ rows: { length: 25 } })
        }
      }

      const pageInfo = tableStandard.getPageInfo(mockTable, 'records')

      expect(pageInfo.value).toBe('Showing 21 to 25 of 25 records')
    })

    it('should handle missing table API gracefully', () => {
      const pageInfo = tableStandard.getPageInfo(null, 'items')

      expect(pageInfo.value).toBe('Showing 1 to 0 of 0 items')
    })

    it('should use default dataType when not provided', () => {
      const mockTable = {
        tableApi: {
          getState: () => ({
            pagination: { pageIndex: 0, pageSize: 10 }
          }),
          getFilteredRowModel: () => ({ rows: { length: 15 } })
        }
      }

      const pageInfo = tableStandard.getPageInfo(mockTable)

      expect(pageInfo.value).toBe('Showing 1 to 10 of 15 items')
    })
  })
})

describe('createSortableColumn', () => {
  it('should create column with correct accessorKey', () => {
    const cellRenderer = vi.fn()
    const column = createSortableColumn('name', 'Name', cellRenderer)

    expect(column.accessorKey).toBe('name')
    expect(column.cell).toBe(cellRenderer)
    expect(column.enableSorting).toBe(true)
  })

  it('should respect enableSorting option', () => {
    const cellRenderer = vi.fn()
    const column = createSortableColumn('name', 'Name', cellRenderer, { enableSorting: false })

    expect(column.enableSorting).toBe(false)
  })

  it('should create header function', () => {
    const cellRenderer = vi.fn()
    const column = createSortableColumn('name', 'Name', cellRenderer)

    expect(typeof column.header).toBe('function')
  })
})

describe('createActionColumn', () => {
  it('should create action column with correct configuration', () => {
    const actions = [
      {
        icon: 'edit',
        color: 'blue',
        variant: 'ghost',
        onClick: vi.fn()
      }
    ]

    const column = createActionColumn(actions)

    expect(column.accessorKey).toBe('actions')
    expect(column.header).toBe('Actions')
    expect(column.enableSorting).toBe(false)
    expect(typeof column.cell).toBe('function')
  })

  it('should handle multiple actions', () => {
    const actions = [
      {
        icon: 'edit',
        color: 'blue',
        variant: 'ghost',
        onClick: vi.fn()
      },
      {
        icon: 'delete',
        color: 'red',
        variant: 'ghost',
        onClick: vi.fn()
      }
    ]

    const column = createActionColumn(actions)

    expect(column.accessorKey).toBe('actions')
    expect(typeof column.cell).toBe('function')
  })
})
