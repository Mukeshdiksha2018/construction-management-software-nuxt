import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserProfilesStore } from "@/stores/userProfiles";

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

// Mock process.server to be false for tests
vi.stubGlobal("process", {
  server: false,
  env: { NODE_ENV: "test" },
});

describe("userProfiles Store", () => {
  let store: ReturnType<typeof useUserProfilesStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useUserProfilesStore();
    mockFetch.mockReset();

    // Ensure a clean state before each test
    store.users = [];
    store.loading = false;
    store.error = null;
    store.hasData = false;
    store.lastFetched = 0;
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe("clearStore", () => {
    it("should clear users, hasData, lastFetched and error", () => {
      // Arrange: set some state
      store.users = [
        {
          id: "1",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          phone: "",
          address: "",
          roleId: undefined,
          status: "active",
          createdAt: "2024-01-01T00:00:00Z",
          lastSignIn: null,
          invitedAt: null,
        },
      ] as any;
      store.hasData = true;
      store.lastFetched = Date.now();
      store.error = "Some error";

      // Act
      store.clearStore();

      // Assert
      expect(store.users).toEqual([]);
      expect(store.hasData).toBe(false);
      expect(store.lastFetched).toBe(0);
      expect(store.error).toBeNull();
    });
  });

  describe("fetchUsers caching", () => {
    it("should not refetch within 5 minutes when not forced and hasData=true", async () => {
      // Arrange: existing data fetched recently
      store.users = [] as any;
      store.hasData = true;
      store.lastFetched = Date.now();

      // Act
      await store.fetchUsers();

      // Assert: $fetch should not be called due to cache
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should force refresh when forceRefresh=true, ignoring cache", async () => {
      const mockUsers = [
        {
          id: "1",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          phone: "",
          address: "",
          roleId: undefined,
          status: "active",
          createdAt: "2024-01-01T00:00:00Z",
          lastSignIn: null,
          invitedAt: null,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: mockUsers,
      });

      // Arrange: has cached data
      store.users = [] as any;
      store.hasData = true;
      store.lastFetched = Date.now();

      // Act
      await store.fetchUsers(true);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith("/api/users/list", undefined);
      expect(store.users).toEqual(mockUsers);
      expect(store.hasData).toBe(true);
      expect(store.lastFetched).not.toBe(0);
    });
  });
});


