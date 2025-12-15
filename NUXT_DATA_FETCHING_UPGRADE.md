# Nuxt Data Fetching Upgrade

This document summarizes the changes made to upgrade the project from using `$fetch` directly to Nuxt's recommended data fetching composables.

## Overview

The project has been updated to use Nuxt's data fetching best practices:
- **`useFetch`** - For initial data fetching in components and stores
- **`useAsyncData`** - For more complex data fetching scenarios
- **`$fetch`** - Reserved for client-side interactions (form submissions, user actions)

## Benefits of This Upgrade

1. **No Double Fetching** - Data fetched on server is automatically forwarded to client
2. **Automatic Caching** - Same data isn't refetched unnecessarily
3. **SSR-Friendly** - Works seamlessly with server-side rendering
4. **Better Performance** - Prevents hydration issues and improves time to interactivity
5. **Automatic Suspense** - Navigation is blocked until data is available

## Changes Made

### 1. Store Updates

#### `stores/auth.ts`
- Updated `fetchUser()` to use `useFetch("/api/auth")`
- Changed from `$fetch` to `useFetch` for better SSR handling

#### `stores/corporations.ts`
- Updated `fetchCorporations()` to use `useFetch("/api/corporations")`
- Updated `addCorporation()`, `getCorporationByUuid()`, `updateCorporation()` to use `useFetch`
- Improved error handling and response processing

#### `stores/roles.ts`
- Updated `fetchRoles()`, `addRole()`, `updateRole()`, `deleteRole()` to use `useFetch`
- Consistent error handling and response processing
- Automatic data refresh after mutations

#### `stores/invitedUsers.ts`
- Updated `fetchUsers()`, `inviteUser()`, `updateUser()`, `deleteUser()` to use `useFetch`
- Improved error handling and automatic data refresh

#### `stores/chartOfAccounts.ts`
- Updated `fetchAccounts()`, `addAccount()`, `bulkImportAccounts()`, `updateAccount()`, `deleteAccount()`, `deleteAllAccounts()` to use `useFetch`
- Added proper TypeScript interfaces for API responses
- Consistent error handling and data refresh patterns

#### `stores/vendors.ts`
- Updated `fetchVendors()`, `addVendor()`, `updateVendor()`, `deleteVendor()` to use `useFetch`
- Improved parameter handling and error management

#### `stores/dailySalesLines.ts`
- Updated `fetchSalesLines()`, `addSalesLine()`, `updateSalesLine()`, `deleteSalesLine()`, `bulkCreateSalesLines()`, `bulkDeleteSalesLines()` to use `useFetch`
- Added `ApiResponse<T>` interface for better type safety
- Fixed interface to include `is_active` property

### 2. Component Updates

#### `pages/index.vue`
- Updated login form submission to use `useFetch("/api/auth/login")`
- Better error handling and response processing

#### `components/Users/UserManagement.vue`
- Updated image upload to use `useFetch('/api/users/upload-image')`
- Fixed TypeScript interface issues
- Improved file handling with proper null checks
- Added custom `TableColumn` interface for better type safety

## Key Patterns Implemented

### 1. Consistent Response Handling
```typescript
const { data } = await useFetch<ApiResponse<T>>('/api/endpoint');
if (data.value?.error) throw new Error(data.value.error);
return data.value?.data;
```

### 2. Automatic Data Refresh
```typescript
// After mutations, refresh data to ensure consistency
await this.fetchData(corporationUUID, true);
```

### 3. Proper Type Safety
```typescript
interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
  message?: string;
}
```

### 4. Error Handling
```typescript
try {
  const { data } = await useFetch('/api/endpoint');
  if (data.value?.error) throw new Error(data.value.error);
  // Process success
} catch (error) {
  this.error = error instanceof Error ? error.message : 'Failed to fetch';
  throw error;
} finally {
  this.loading = false;
}
```

## When to Use Each Composable

### `useFetch`
- **Use for**: Initial page data, SEO-sensitive data, data needed on first render
- **Examples**: User authentication, dashboard data, list data
- **Benefits**: Automatic SSR handling, caching, suspense

### `useAsyncData`
- **Use for**: Complex data fetching logic, third-party integrations, custom query layers
- **Examples**: Complex API calls, data transformations, multiple API calls
- **Benefits**: More control, custom caching keys, complex logic

### `$fetch`
- **Use for**: Client-side interactions, form submissions, user actions
- **Examples**: Login forms, file uploads, real-time updates
- **Benefits**: Simple, direct, no caching overhead

## Migration Notes

1. **Response Structure**: All API responses now use `data.value` instead of direct response
2. **Error Handling**: Consistent error handling with proper type checking
3. **Data Refresh**: Automatic data refresh after mutations for consistency
4. **Type Safety**: Added proper TypeScript interfaces for all API responses

## Testing Recommendations

1. Test SSR functionality to ensure data is properly forwarded
2. Verify that data isn't fetched twice (check network tab)
3. Test navigation between pages to ensure data persistence
4. Verify error handling works correctly
5. Test data refresh after mutations

## Future Improvements

1. Consider implementing `useLazyFetch` for non-critical data
2. Add `pick` and `transform` options to minimize payload size
3. Implement proper caching strategies with `key` options
4. Add `watch` options for reactive data fetching
5. Consider implementing `useNuxtData` for shared data between components

## Conclusion

This upgrade significantly improves the application's performance, SSR capabilities, and developer experience. The consistent use of Nuxt's data fetching composables ensures that the application follows best practices and provides a better user experience.
