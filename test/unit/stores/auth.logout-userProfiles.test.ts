import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "@/stores/auth";

// Use vi.hoisted() to define mocks that are hoisted with vi.mock()
const { mockSignOut, mockClearAllData, mockClearStore, mockNavigateTo } = vi.hoisted(() => {
  const mockSignOut = vi.fn().mockResolvedValue({ error: null });
  const mockClearAllData = vi.fn().mockResolvedValue(undefined);
  const mockClearStore = vi.fn();
  const mockNavigateTo = vi.fn();
  
  return {
    mockSignOut,
    mockClearAllData,
    mockClearStore,
    mockNavigateTo,
  };
});

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signOut: mockSignOut,
  },
};

vi.mock("@/utils/supabaseClient", () => ({
  useSupabaseClient: () => mockSupabaseClient,
}));

// Mock dbHelpers
vi.mock("@/utils/indexedDb", () => ({
  dbHelpers: {
    clearAllData: mockClearAllData,
  },
}));

// Mock userProfiles store
vi.mock("@/stores/userProfiles", () => ({
  useUserProfilesStore: () => ({
    clearStore: mockClearStore,
  }),
}));

// Mock navigateTo
vi.stubGlobal("navigateTo", mockNavigateTo);

// Mock process.server to be false for tests
vi.stubGlobal("process", {
  server: false,
  env: { NODE_ENV: "test" },
});

describe("auth Store - logout integration with userProfiles", () => {
  let store: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useAuthStore();

    mockSignOut.mockClear();
    mockClearAllData.mockClear();
    mockClearStore.mockClear();
    mockNavigateTo.mockClear();

    store.user = { id: "user-1", email: "test@example.com" } as any;
    store.isInitialized = true;
  });

  afterEach(() => {
    mockSignOut.mockReset();
    mockClearAllData.mockReset();
    mockClearStore.mockReset();
    mockNavigateTo.mockReset();
  });

  it("should clear auth state, userProfiles store, IndexedDB and navigate on successful logout", async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });

    await store.logout();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(store.user).toBeNull();
    expect(store.isInitialized).toBe(false);
    expect(mockClearStore).toHaveBeenCalledTimes(1);
    expect(mockClearAllData).toHaveBeenCalledTimes(1);
    expect(mockNavigateTo).toHaveBeenCalledWith("/");
  });

  it("should still clear state and call clearStore/clearAllData when signOut throws", async () => {
    mockSignOut.mockRejectedValueOnce(new Error("network error"));

    await store.logout();

    expect(store.user).toBeNull();
    expect(store.isInitialized).toBe(false);
    expect(mockClearStore).toHaveBeenCalledTimes(1);
    expect(mockClearAllData).toHaveBeenCalledTimes(1);
    expect(mockNavigateTo).toHaveBeenCalledWith("/");
  });
});


