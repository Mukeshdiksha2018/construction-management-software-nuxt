import { vi } from "vitest";
import { defineStore } from "pinia";
import {
  ref,
  computed,
  reactive,
  watch,
  nextTick,
  readonly,
  onMounted,
} from "vue";

// Mock useTemplateRef
global.useTemplateRef = vi.fn(() => ({ value: null }));

// Mock useToast
global.useToast = vi.fn(() => ({
  add: vi.fn()
}));

// Mock Nuxt auto-imports
global.defineStore = defineStore;
global.ref = ref;
global.computed = computed;
global.reactive = reactive;
global.watch = watch;
global.nextTick = nextTick;
global.readonly = readonly;
global.onMounted = onMounted;

// Mock Nuxt 4 functions
global.definePageMeta = vi.fn();
global.defineEventHandler = vi.fn();
global.getQuery = vi.fn();
global.readBody = vi.fn();
global.createError = vi.fn();
global.useHead = vi.fn();

// Mock global objects
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock window.matchMedia (only if window exists)
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock File and FileReader
global.File = class MockFile {
  constructor(
    public content: any[],
    public name: string,
    public options: any = {}
  ) {
    this.size = content.join("").length;
    this.type = options.type || "text/plain";
    this.lastModified = Date.now();
  }

  size: number;
  type: string;
  lastModified: number;
};

global.FileReader = class MockFileReader {
  result: string | null = null;
  error: any = null;
  readyState: number = 0;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onloadend: ((event: any) => void) | null = null;

  readAsDataURL(file: File) {
    setTimeout(() => {
      this.result = `data:${file.type};base64,${btoa(file.content.join(""))}`;
      this.readyState = 2;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    }, 0);
  }

  readAsText(file: File) {
    setTimeout(() => {
      this.result = file.content.join("");
      this.readyState = 2;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    }, 0);
  }
};

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "mock-object-url");
global.URL.revokeObjectURL = vi.fn();

// Mock crypto for UUID generation
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: vi.fn(() => "mock-uuid-1234-5678-9012-345678901234"),
  },
});

// Mock IndexedDB for tests
const mockIndexedDB = {
  open: vi.fn(() => ({
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(),
          put: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          count: vi.fn(() => ({ result: 0 })),
          openCursor: vi.fn(() => ({ result: null })),
          index: vi.fn(() => ({
            get: vi.fn(),
            getAll: vi.fn(() => ({ result: [] })),
            count: vi.fn(() => ({ result: 0 })),
            openCursor: vi.fn(() => ({ result: null }))
          }))
        }))
      }))
    },
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null
  })),
  deleteDatabase: vi.fn(() => ({
    result: null,
    onsuccess: null,
    onerror: null
  })),
  cmp: vi.fn(() => 0)
};

// Mock Dexie
vi.mock('dexie', () => ({
  default: class MockDexie {
    constructor(name: string) {
      this.name = name;
    }
    
    version(versionNumber: number) {
      return {
        stores: vi.fn(() => this),
        upgrade: vi.fn(() => this)
      };
    }
    
    open() {
      return Promise.resolve();
    }
    
    close() {
      return Promise.resolve();
    }
    
    delete() {
      return Promise.resolve();
    }
    
    // Add all the table methods
    projects = {
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({
            first: vi.fn().mockResolvedValue(null),
            toArray: vi.fn().mockResolvedValue([])
          }))
        }))
      })),
      toArray: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined)
    };
    
    billEntries = {
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({
            first: vi.fn().mockResolvedValue(null),
            toArray: vi.fn().mockResolvedValue([])
          }))
        }))
      })),
      toArray: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined)
    };
    
    syncMetadata = {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null)
        }))
      }))
    };
  }
}));

// Set up IndexedDB mock
Object.defineProperty(global, "indexedDB", {
  value: mockIndexedDB,
  writable: true,
});

Object.defineProperty(global, "IDBKeyRange", {
  value: {
    only: vi.fn(),
    lowerBound: vi.fn(),
    upperBound: vi.fn(),
    bound: vi.fn(),
  },
  writable: true,
});
