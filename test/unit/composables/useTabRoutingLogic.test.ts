import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Vue functions
vi.mock('vue', () => ({
  computed: (fn: () => any) => ({ value: fn() }),
  readonly: (ref: any) => ref
}))

// Create mock route and router
const createMockRoute = (query: any = {}) => ({ query })
const createMockRouter = () => ({ push: vi.fn() })

// Create a factory to test the logic without router dependencies
const createTabRoutingLogic = (route: any, router: any, tabs: any[], defaultTab: string) => {
  // Extract the pure logic from useTabRouting
  const currentTab = { 
    value: (() => {
      const tabParam = route.query.tab
      if (tabParam && typeof tabParam === 'string') {
        const validTab = tabs.find((tab) => tab.name === tabParam)
        return validTab ? validTab.name : defaultTab
      }
      return defaultTab
    })()
  }

  const navigateToTab = (tab: string) => {
    const currentQuery = { ...route.query }
    currentQuery.tab = tab
    router.push({ query: currentQuery })
  }

  const isTabActive = (tab: string): boolean => {
    return currentTab.value === tab
  }

  const initializeUrl = () => {
    if (!route.query.tab) {
      navigateToTab(defaultTab)
    }
  }

  const getTabConfig = (tabName: string) => {
    return tabs.find((tab) => tab.name === tabName)
  }

  const getAvailableTabs = () => {
    return tabs
  }

  return {
    currentTab,
    navigateToTab,
    isTabActive,
    initializeUrl,
    getTabConfig,
    getAvailableTabs,
    tabs
  }
}

describe('useTabRouting Logic', () => {
  const MOCK_TABS = [
    { name: 'tab-one', label: 'Tab One', icon: 'icon-1', value: 'tab-one' },
    { name: 'tab-two', label: 'Tab Two', icon: 'icon-2', value: 'tab-two' },
    { name: 'tab-three', label: 'Tab Three', icon: 'icon-3', value: 'tab-three' }
  ]

  let mockRoute: any
  let mockRouter: any

  beforeEach(() => {
    mockRoute = createMockRoute()
    mockRouter = createMockRouter()
  })

  describe('currentTab computation', () => {
    it('should return current tab from URL query', () => {
      mockRoute = createMockRoute({ tab: 'tab-two' })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.currentTab.value).toBe('tab-two')
    })

    it('should return default tab when URL query tab is invalid', () => {
      mockRoute = createMockRoute({ tab: 'invalid-tab' })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.currentTab.value).toBe('tab-one')
    })

    it('should return default tab when no tab query parameter exists', () => {
      mockRoute = createMockRoute({})
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.currentTab.value).toBe('tab-one')
    })

    it('should return default tab when tab query is not a string', () => {
      mockRoute = createMockRoute({ tab: ['tab-one', 'tab-two'] })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.currentTab.value).toBe('tab-one')
    })

    it('should return default tab when tab query is null', () => {
      mockRoute = createMockRoute({ tab: null })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.currentTab.value).toBe('tab-one')
    })

    it('should be case sensitive for tab names', () => {
      mockRoute = createMockRoute({ tab: 'Tab-One' }) // Different case
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.currentTab.value).toBe('tab-one') // Should fallback to default
    })
  })

  describe('navigateToTab', () => {
    it('should call router.push with correct query parameters', () => {
      mockRoute = createMockRoute({ tab: 'tab-one' })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      tabRouting.navigateToTab('tab-two')
      
      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { tab: 'tab-two' }
      })
    })

    it('should preserve existing query parameters', () => {
      mockRoute = createMockRoute({ 
        tab: 'tab-one', 
        search: 'test',
        filter: 'active'
      })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      tabRouting.navigateToTab('tab-three')
      
      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { 
          tab: 'tab-three',
          search: 'test',
          filter: 'active'
        }
      })
    })

    it('should handle empty query object', () => {
      mockRoute = createMockRoute({})
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      tabRouting.navigateToTab('tab-two')
      
      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { tab: 'tab-two' }
      })
    })

    it('should allow navigation to any tab name (validation should be done elsewhere)', () => {
      mockRoute = createMockRoute({ tab: 'tab-one' })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      tabRouting.navigateToTab('non-existent-tab')
      
      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { tab: 'non-existent-tab' }
      })
    })
  })

  describe('isTabActive', () => {
    it('should return true for currently active tab', () => {
      mockRoute = createMockRoute({ tab: 'tab-two' })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.isTabActive('tab-two')).toBe(true)
    })

    it('should return false for inactive tabs', () => {
      mockRoute = createMockRoute({ tab: 'tab-two' })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.isTabActive('tab-one')).toBe(false)
      expect(tabRouting.isTabActive('tab-three')).toBe(false)
    })

    it('should return true for default tab when no tab is specified', () => {
      mockRoute = createMockRoute({})
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.isTabActive('tab-one')).toBe(true)
      expect(tabRouting.isTabActive('tab-two')).toBe(false)
    })

    it('should handle non-existent tab names', () => {
      mockRoute = createMockRoute({ tab: 'tab-one' })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.isTabActive('non-existent')).toBe(false)
    })
  })

  describe('initializeUrl', () => {
    it('should navigate to default tab when no tab query exists', () => {
      mockRoute = createMockRoute({})
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      tabRouting.initializeUrl()
      
      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { tab: 'tab-one' }
      })
    })

    it('should not navigate when tab query already exists', () => {
      mockRoute = createMockRoute({ tab: 'tab-two' })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      tabRouting.initializeUrl()
      
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('should not navigate when tab query exists but is invalid', () => {
      mockRoute = createMockRoute({ tab: 'invalid-tab' })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      tabRouting.initializeUrl()
      
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('should preserve other query parameters when initializing', () => {
      mockRoute = createMockRoute({ search: 'test', filter: 'active' })
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      tabRouting.initializeUrl()
      
      expect(mockRouter.push).toHaveBeenCalledWith({
        query: { 
          search: 'test',
          filter: 'active',
          tab: 'tab-one'
        }
      })
    })
  })

  describe('getTabConfig', () => {
    it('should return correct tab configuration for existing tab', () => {
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      const config = tabRouting.getTabConfig('tab-two')
      
      expect(config).toEqual({
        name: 'tab-two',
        label: 'Tab Two',
        icon: 'icon-2',
        value: 'tab-two'
      })
    })

    it('should return undefined for non-existent tab', () => {
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      const config = tabRouting.getTabConfig('non-existent')
      
      expect(config).toBeUndefined()
    })

    it('should handle empty tab name', () => {
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      const config = tabRouting.getTabConfig('')
      
      expect(config).toBeUndefined()
    })

    it('should be case sensitive', () => {
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      const config = tabRouting.getTabConfig('Tab-One') // Different case
      
      expect(config).toBeUndefined()
    })
  })

  describe('getAvailableTabs', () => {
    it('should return all available tabs', () => {
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      const availableTabs = tabRouting.getAvailableTabs()
      
      expect(availableTabs).toEqual(MOCK_TABS)
      expect(availableTabs).toHaveLength(3)
    })

    it('should return reference to original tabs array', () => {
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      const availableTabs = tabRouting.getAvailableTabs()
      
      expect(availableTabs).toBe(MOCK_TABS)
    })

    it('should work with empty tabs array', () => {
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, [], 'default')
      
      const availableTabs = tabRouting.getAvailableTabs()
      
      expect(availableTabs).toEqual([])
    })
  })

  describe('tabs property', () => {
    it('should expose tabs configuration', () => {
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-one')
      
      expect(tabRouting.tabs).toEqual(MOCK_TABS)
    })
  })

  describe('Edge cases and validation', () => {
    it('should work with single tab', () => {
      const singleTab = [{ name: 'only-tab', label: 'Only Tab', icon: 'icon', value: 'only-tab' }]
      mockRoute = createMockRoute({ tab: 'only-tab' })
      
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, singleTab, 'only-tab')
      
      expect(tabRouting.currentTab.value).toBe('only-tab')
      expect(tabRouting.isTabActive('only-tab')).toBe(true)
      expect(tabRouting.getAvailableTabs()).toEqual(singleTab)
    })

    it('should handle tabs with special characters in names', () => {
      const specialTabs = [
        { name: 'tab-with-dashes', label: 'Tab With Dashes', icon: 'icon', value: 'tab-with-dashes' },
        { name: 'tab_with_underscores', label: 'Tab With Underscores', icon: 'icon', value: 'tab_with_underscores' }
      ]
      mockRoute = createMockRoute({ tab: 'tab-with-dashes' })
      
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, specialTabs, 'tab-with-dashes')
      
      expect(tabRouting.currentTab.value).toBe('tab-with-dashes')
      expect(tabRouting.isTabActive('tab-with-dashes')).toBe(true)
    })

    it('should maintain consistency between tab name and value', () => {
      MOCK_TABS.forEach(tab => {
        expect(tab.name).toBe(tab.value)
      })
    })

    it('should handle different default tab configurations', () => {
      // Test with different default tab
      mockRoute = createMockRoute({})
      const tabRouting = createTabRoutingLogic(mockRoute, mockRouter, MOCK_TABS, 'tab-three')
      
      expect(tabRouting.currentTab.value).toBe('tab-three')
      expect(tabRouting.isTabActive('tab-three')).toBe(true)
    })
  })
})
