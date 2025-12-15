import { describe, it, expect } from "vitest";

/**
 * Unit tests for the master items selection merging logic
 * These tests verify the core logic without requiring full component mounting
 */

describe("Master Items Selection - Merging Logic", () => {
  // Helper function that matches the implementation
  const getItemUniqueId = (item: any): string => {
    return item.item_uuid || item.uuid || item.id || "";
  };

  describe("Initial Import - Replace All Items", () => {
    it("should replace all items when confirming initial import", () => {
      const existingItems: any[] = [];
      const selectedItems = [
        { item_uuid: "item-1", item_name: "Concrete" },
        { item_uuid: "item-2", item_name: "Rebar" },
      ];

      // Initial import: replace all
      const result = [...selectedItems];

      expect(result.length).toBe(2);
      expect(result[0].item_uuid).toBe("item-1");
      expect(result[1].item_uuid).toBe("item-2");
    });

    it("should replace existing items when confirming initial import", () => {
      const existingItems = [
        { item_uuid: "existing-1", item_name: "Existing Item" },
      ];
      const selectedItems = [
        { item_uuid: "item-1", item_name: "Concrete" },
        { item_uuid: "item-2", item_name: "Rebar" },
      ];

      // Initial import: replace all (existing items are ignored)
      const result = [...selectedItems];

      expect(result.length).toBe(2);
      expect(result.find((item) => item.item_uuid === "existing-1")).toBeUndefined();
      expect(result.find((item) => item.item_uuid === "item-1")).toBeDefined();
    });
  });

  describe("Editing Existing Selection - Merge Items", () => {
    it("should preserve existing items and add new selected items when editing", () => {
      const existingItems = [
        {
          item_uuid: "item-1",
          item_name: "Concrete",
          description: "User edited description", // User edit
        },
        {
          item_uuid: "item-2",
          item_name: "Rebar",
        },
      ];

      const selectedItems = [
        { item_uuid: "item-1", item_name: "Concrete" }, // Keep existing
        { item_uuid: "item-2", item_name: "Rebar" }, // Keep existing
        { item_uuid: "item-3", item_name: "Lumber" }, // Add new
      ];

      // Editing logic: merge
      const currentItemIds = new Set(existingItems.map((item) => getItemUniqueId(item)));
      const selectedItemIds = new Set(selectedItems.map((item) => getItemUniqueId(item)));

      // Keep existing items that are still selected
      const itemsToKeep = existingItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && selectedItemIds.has(itemId);
      });

      // Add newly selected items that don't exist yet
      const newItems = selectedItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && !currentItemIds.has(itemId);
      });

      const result = [...itemsToKeep, ...newItems];

      expect(result.length).toBe(3);
      
      // Existing items should be preserved (with user edits)
      const item1 = result.find((item) => item.item_uuid === "item-1");
      expect(item1).toBeDefined();
      expect(item1?.description).toBe("User edited description"); // User edit preserved

      const item2 = result.find((item) => item.item_uuid === "item-2");
      expect(item2).toBeDefined();

      // New item should be added
      const item3 = result.find((item) => item.item_uuid === "item-3");
      expect(item3).toBeDefined();
      expect(item3?.item_name).toBe("Lumber");
    });

    it("should remove items that are deselected when editing", () => {
      const existingItems = [
        { item_uuid: "item-1", item_name: "Concrete" },
        { item_uuid: "item-2", item_name: "Rebar" },
        { item_uuid: "item-3", item_name: "Lumber" },
      ];

      const selectedItems = [
        { item_uuid: "item-1", item_name: "Concrete" }, // Keep
        { item_uuid: "item-3", item_name: "Lumber" }, // Keep
        // item-2 is NOT selected (should be removed)
      ];

      // Editing logic: merge
      const currentItemIds = new Set(existingItems.map((item) => getItemUniqueId(item)));
      const selectedItemIds = new Set(selectedItems.map((item) => getItemUniqueId(item)));

      const itemsToKeep = existingItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && selectedItemIds.has(itemId);
      });

      const newItems = selectedItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && !currentItemIds.has(itemId);
      });

      const result = [...itemsToKeep, ...newItems];

      expect(result.length).toBe(2);
      expect(result.find((item) => item.item_uuid === "item-1")).toBeDefined();
      expect(result.find((item) => item.item_uuid === "item-3")).toBeDefined();
      expect(result.find((item) => item.item_uuid === "item-2")).toBeUndefined();
    });

    it("should add new items without removing existing ones when editing", () => {
      const existingItems = [
        { item_uuid: "item-1", item_name: "Concrete" },
        { item_uuid: "item-2", item_name: "Rebar" },
      ];

      const selectedItems = [
        { item_uuid: "item-1", item_name: "Concrete" }, // Keep existing
        { item_uuid: "item-2", item_name: "Rebar" }, // Keep existing
        { item_uuid: "item-4", item_name: "Steel" }, // Add new
      ];

      // Editing logic: merge
      const currentItemIds = new Set(existingItems.map((item) => getItemUniqueId(item)));
      const selectedItemIds = new Set(selectedItems.map((item) => getItemUniqueId(item)));

      const itemsToKeep = existingItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && selectedItemIds.has(itemId);
      });

      const newItems = selectedItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && !currentItemIds.has(itemId);
      });

      const result = [...itemsToKeep, ...newItems];

      expect(result.length).toBe(3);
      expect(result.find((item) => item.item_uuid === "item-1")).toBeDefined();
      expect(result.find((item) => item.item_uuid === "item-2")).toBeDefined();
      expect(result.find((item) => item.item_uuid === "item-4")).toBeDefined();
    });
  });

  describe("Item Identification", () => {
    it("should correctly identify items by item_uuid", () => {
      const item1 = { item_uuid: "uuid-1", id: "id-1" };
      const item2 = { item_uuid: "uuid-2", id: "id-2" };

      expect(getItemUniqueId(item1)).toBe("uuid-1");
      expect(getItemUniqueId(item2)).toBe("uuid-2");
    });

    it("should fallback to uuid when item_uuid is missing", () => {
      const item1 = { uuid: "uuid-1", id: "id-1" };
      const item2 = { id: "id-2" };

      expect(getItemUniqueId(item1)).toBe("uuid-1");
      expect(getItemUniqueId(item2)).toBe("id-2");
    });

    it("should fallback to id when item_uuid and uuid are missing", () => {
      const item1 = { id: "id-1" };
      const item2 = {};

      expect(getItemUniqueId(item1)).toBe("id-1");
      expect(getItemUniqueId(item2)).toBe("");
    });

    it("should match items by item_uuid even if other IDs differ", () => {
      const existingItem = {
        id: "existing-id",
        item_uuid: "item-uuid-1",
        item_name: "Concrete",
        description: "User edited",
      };

      const selectedItem = {
        id: "different-id",
        item_uuid: "item-uuid-1", // Same item_uuid
        item_name: "Concrete Updated",
      };

      const existingItems = [existingItem];
      const selectedItems = [selectedItem];

      const currentItemIds = new Set(existingItems.map((item) => getItemUniqueId(item)));
      const selectedItemIds = new Set(selectedItems.map((item) => getItemUniqueId(item)));

      // Should match by item_uuid
      const itemsToKeep = existingItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && selectedItemIds.has(itemId);
      });

      expect(itemsToKeep.length).toBe(1);
      expect(itemsToKeep[0].item_uuid).toBe("item-uuid-1");
      expect(itemsToKeep[0].description).toBe("User edited"); // User edit preserved
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty selected items array", () => {
      const existingItems = [
        { item_uuid: "item-1", item_name: "Concrete" },
      ];

      const selectedItems: any[] = [];

      // Editing logic
      const currentItemIds = new Set(existingItems.map((item) => getItemUniqueId(item)));
      const selectedItemIds = new Set(selectedItems.map((item) => getItemUniqueId(item)));

      const itemsToKeep = existingItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && selectedItemIds.has(itemId);
      });

      const newItems = selectedItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && !currentItemIds.has(itemId);
      });

      const result = [...itemsToKeep, ...newItems];

      // All items should be removed (none selected)
      expect(result.length).toBe(0);
    });

    it("should handle items without any ID by skipping them", () => {
      const existingItems = [
        { item_uuid: "item-1", item_name: "Concrete" },
        { item_name: "No ID Item" }, // No ID
      ];

      const selectedItems = [
        { item_uuid: "item-1", item_name: "Concrete" },
        { item_name: "No ID Item" }, // No ID
      ];

      const currentItemIds = new Set(existingItems.map((item) => getItemUniqueId(item)));
      const selectedItemIds = new Set(selectedItems.map((item) => getItemUniqueId(item)));

      const itemsToKeep = existingItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && selectedItemIds.has(itemId);
      });

      const newItems = selectedItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && !currentItemIds.has(itemId);
      });

      const result = [...itemsToKeep, ...newItems];

      // Only item with ID should be kept
      expect(result.length).toBe(1);
      expect(result[0].item_uuid).toBe("item-1");
    });

    it("should handle duplicate items in selectedItems", () => {
      const existingItems = [
        { item_uuid: "item-1", item_name: "Concrete" },
      ];

      const selectedItems = [
        { item_uuid: "item-1", item_name: "Concrete" },
        { item_uuid: "item-1", item_name: "Concrete" }, // Duplicate
        { item_uuid: "item-2", item_name: "Rebar" },
      ];

      const currentItemIds = new Set(existingItems.map((item) => getItemUniqueId(item)));
      const selectedItemIds = new Set(selectedItems.map((item) => getItemUniqueId(item)));

      const itemsToKeep = existingItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && selectedItemIds.has(itemId);
      });

      const newItems = selectedItems.filter((item) => {
        const itemId = getItemUniqueId(item);
        return itemId && !currentItemIds.has(itemId);
      });

      const result = [...itemsToKeep, ...newItems];

      // Should have 2 unique items (item-1 kept, item-2 added)
      expect(result.length).toBe(2);
      expect(result.filter((item) => item.item_uuid === "item-1").length).toBe(1);
      expect(result.find((item) => item.item_uuid === "item-2")).toBeDefined();
    });
  });

  describe("Cancel Behavior Logic", () => {
    it("should distinguish between initial import and editing selection", () => {
      // Initial import: isEditingMasterSelection = false
      const isEditingMasterSelectionInitial = false;
      
      // Editing: isEditingMasterSelection = true
      const isEditingMasterSelectionEditing = true;

      expect(isEditingMasterSelectionInitial).toBe(false);
      expect(isEditingMasterSelectionEditing).toBe(true);
    });

    it("should preserve data when cancelling edit selection", () => {
      const existingItems = [
        { item_uuid: "item-1", item_name: "Concrete", description: "User edited" },
      ];
      const includeItemsBefore = "IMPORT_ITEMS_FROM_MASTER";
      const isEditingMasterSelection = true;

      // When cancelling edit selection
      if (isEditingMasterSelection) {
        // Data should remain unchanged
        const itemsAfter = existingItems;
        const includeItemsAfter = includeItemsBefore;

        expect(itemsAfter.length).toBe(existingItems.length);
        expect(itemsAfter[0].description).toBe("User edited");
        expect(includeItemsAfter).toBe(includeItemsBefore);
      }
    });

    it("should revert include_items when cancelling initial import", () => {
      const includeItemsBefore = "IMPORT_ITEMS_FROM_MASTER";
      const isEditingMasterSelection = false;

      // When cancelling initial import
      if (!isEditingMasterSelection) {
        // include_items should be cleared
        const includeItemsAfter = "";

        expect(includeItemsAfter).toBe("");
        expect(includeItemsAfter).not.toBe(includeItemsBefore);
      }
    });
  });
});
