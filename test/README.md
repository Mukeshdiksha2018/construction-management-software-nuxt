# Testing Guide

This directory contains unit tests for the property management application.

## Test Structure

```
test/
├── unit/
│   ├── composables/     # Tests for Vue composables
│   ├── stores/          # Tests for Pinia stores
│   └── utils/           # Tests for utility functions
└── README.md           # This file
```

## Running Tests

```bash
# Run all tests
npm run test

# Run tests once (no watch mode)
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest test/unit/composables/useDateFormat.test.ts

# Run tests matching a pattern
npx vitest --grep "formatDate"
```

## 📋 Current Test Coverage

### 1. **Date Formatting Utilities** (`useDateFormat.test.ts` - 21 tests)
**File:** `composables/useDateFormat.ts`

**Functions Tested:**
- ✅ `formatDate()`, `formatDateFullYear()`, `formatDateTime()`
- ✅ `formatRelativeDate()` - "2 days ago", "1 week ago" etc.
- ✅ `getCurrentDate()`, `getCurrentDateFullYear()`
- ✅ `parseDate()`, `isOverdue()`, `isDueSoon()`

---

### 2. **Currency Formatting Utilities** (`useCurrencyFormat.test.ts` - 26 tests)
**File:** `composables/useCurrencyFormat.ts`

**Functions Tested:**
- ✅ `formatCurrency()`, `formatNumber()` with mocked store
- ✅ Currency properties: `currencyCode`, `currencySymbol`, `countryCode`
- ✅ Different currency types (USD, EUR, GBP)
- ✅ Edge cases and fallback behavior

---

### 3. **Table Standard Utilities** (`useTableStandard.test.ts` - 24 tests)
**File:** `composables/useTableStandard.ts`

**Functions Tested:**
- ✅ `updatePageSize()`, `shouldShowPagination()`
- ✅ `getPaginationProps()`, `getPageInfo()`
- ✅ `createSortableColumn()`, `createActionColumn()`
- ✅ TanStack Table API integration

---

### 4. **Tab Configuration Constants** (`tabRoutingConstants.test.ts` - 9 tests)
**File:** `composables/useTabRouting.ts` (constants only)

**Constants Tested:**
- ✅ `USERS_TABS`, `CORPORATION_TABS`, `PAYABLES_TABS`
- ✅ Tab structure validation and naming conventions
- ✅ Icon format validation

---

### 5. **Tab Routing Logic** (`useTabRoutingLogic.test.ts` - 46 tests)
**File:** `composables/useTabRouting.ts` (pure logic functions)

**Functions Tested:**
- ✅ URL query parameter handling and navigation
- ✅ Tab validation and fallback logic
- ✅ Query parameter preservation
- ✅ Tab configuration management

---

### 6. **Bill Entries Data Logic** (`useBillEntriesData.test.ts` - 20 tests)
**File:** `composables/useBillEntriesData.ts` (computed properties)

**Functions Tested:**
- ✅ Store data mapping and computed properties
- ✅ Pending vs approved bill calculations
- ✅ Currency formatting integration
- ✅ Data fetching logic with UUID validation

## Test Examples

## Writing Tests

### Composable Testing
When testing composables that depend on stores or other composables, use mocking:

```typescript
// Mock the store
const mockStore = { selectedCorporation: { currency: 'USD' } }
vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockStore
}))

// Test the composable
const { formatCurrency } = useCurrencyFormat()
expect(formatCurrency(1234.56)).toBe('$1,234.56')
```

### Store Testing
When testing Pinia stores, create a fresh Pinia instance:

```typescript
import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
  store = useAuthStore()
})
```

### Mocking External Dependencies
Use `vi.mock()` to mock external dependencies:

```typescript
// Mock Supabase client
vi.mock('@/utils/supabaseClient', () => ({
  useSupabaseClient: () => mockSupabaseClient
}))

// Mock global functions
global.$fetch = vi.fn()
global.navigateTo = vi.fn()
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the function does, not how it does it
2. **Use Descriptive Test Names**: Make test names clear about what they're testing
3. **Mock External Dependencies**: Don't make real API calls or access real storage in tests
4. **Test Edge Cases**: Include tests for null, undefined, empty strings, etc.
5. **Keep Tests Simple**: One assertion per test when possible
6. **Use Setup/Teardown**: Use `beforeEach` and `afterEach` to reset state

## Test Coverage

To check test coverage, run:

```bash
npx vitest --coverage
```

This will generate a coverage report showing which parts of your code are tested.
