/**
 * Composable for making API calls with BASE_URL from runtime config
 * This ensures all API calls use the configured base URL
 */
export const useApiClient = () => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.BASE_URL || '';

  /**
   * Constructs a full API URL from a relative path
   * @param path - Relative API path (e.g., '/api/users' or 'api/users')
   * @returns Full URL with base URL prepended
   */
  const getApiUrl = (path: string): string => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/${cleanPath}`;
  };

  /**
   * Wrapper around $fetch that automatically prepends BASE_URL
   * @param path - Relative API path
   * @param options - Fetch options (same as $fetch)
   * @returns Promise with the response
   */
  const apiFetch = <T = any>(
    path: string,
    options?: Parameters<typeof $fetch>[1]
  ): Promise<T> => {
    const fullUrl = getApiUrl(path);
    return $fetch<T>(fullUrl, options);
  };

  return {
    getApiUrl,
    apiFetch,
    baseUrl,
  };
};

