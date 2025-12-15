import Dexie, { type Table } from 'dexie';

// Define interfaces for IndexedDB storage
// Note: We use generic types with corporationId for storage
// The actual BillEntry and Project types are defined in their respective stores
export interface DBBillEntry {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBProject {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBVendor {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBPOInstruction {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBUOM {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBChartOfAccount {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBStorageLocation {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBCostCodeDivision {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBCostCodeConfiguration {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBCorporation {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBEstimate {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBPurchaseOrder {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBStockReceiptNote {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBChangeOrder {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBStockReturnNote {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface DBTermsAndCondition {
  id?: number;
  corporationId: string;
  [key: string]: any;
}

export interface SyncMetadata {
  key: string;
  corporationId: string;
  lastSyncedAt: Date;
  dataType:
    | "billEntries"
    | "projects"
    | "vendors"
    | "poInstructions"
    | "uom"
    | "freight"
    | "shipVia"
    | "approvalChecks"
    | "locations"
    | "projectTypes"
    | "serviceTypes"
    | "chartOfAccounts"
    | "storageLocations"
    | "costCodeDivisions"
    | "costCodeConfigurations"
    | "corporations"
    | "estimates"
    | "purchaseOrders"
    | "stockReceiptNotes"
    | "changeOrders"
    | "stockReturnNotes"
    | "termsAndConditions";
}

// Define the database class
class PropertyManagementDB extends Dexie {
  billEntries!: Table<DBBillEntry>;
  projects!: Table<DBProject>;
  vendors!: Table<DBVendor>;
  poInstructions!: Table<DBPOInstruction>;
  uom!: Table<DBUOM>;
  projectTypes!: Table<DBProject>;
  serviceTypes!: Table<DBProject>;
  chartOfAccounts!: Table<DBChartOfAccount>;
  storageLocations!: Table<DBStorageLocation>;
  costCodeDivisions!: Table<DBCostCodeDivision>;
  costCodeConfigurations!: Table<DBCostCodeConfiguration>;
  corporations!: Table<DBCorporation>;
  estimates!: Table<DBEstimate>;
  purchaseOrders!: Table<DBPurchaseOrder>;
  stockReceiptNotes!: Table<DBStockReceiptNote>;
  changeOrders!: Table<DBChangeOrder>;
  stockReturnNotes!: Table<DBStockReturnNote>;
  termsAndConditions!: Table<DBTermsAndCondition>;
  syncMetadata!: Table<SyncMetadata>;

  constructor() {
    super("PropertyManagementDB");

    this.version(1).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });

    this.version(2).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });

    this.version(3).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });

    this.version(4).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });

    this.version(5).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
    this.version(6).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      freight: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
    // v7: Add separate shipVia table (decouple from freight)
    this.version(7).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      freight: "++id, corporationId, uuid",
      shipVia: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
    // v8: Add locations (global)
    this.version(8).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      freight: "++id, corporationId, uuid",
      shipVia: "++id, corporationId, uuid",
      locations: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
    // v9: Add purchase orders table
    this.version(9).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      freight: "++id, corporationId, uuid",
      shipVia: "++id, corporationId, uuid",
      locations: "++id, corporationId, uuid",
      purchaseOrders: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
    // v10: Add stock receipt notes table
    this.version(10).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      freight: "++id, corporationId, uuid",
      shipVia: "++id, corporationId, uuid",
      locations: "++id, corporationId, uuid",
      purchaseOrders: "++id, corporationId, uuid",
      stockReceiptNotes: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
    // v11: Add change orders table
    this.version(11).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      freight: "++id, corporationId, uuid",
      shipVia: "++id, corporationId, uuid",
      locations: "++id, corporationId, uuid",
      purchaseOrders: "++id, corporationId, uuid",
      stockReceiptNotes: "++id, corporationId, uuid",
      changeOrders: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
    // v12: Add approval checks table (global)
    this.version(12).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      freight: "++id, corporationId, uuid",
      shipVia: "++id, corporationId, uuid",
      locations: "++id, corporationId, uuid",
      purchaseOrders: "++id, corporationId, uuid",
      stockReceiptNotes: "++id, corporationId, uuid",
      changeOrders: "++id, corporationId, uuid",
      approvalChecks: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
    // v13: Add stock return notes table
    this.version(13).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      freight: "++id, corporationId, uuid",
      shipVia: "++id, corporationId, uuid",
      locations: "++id, corporationId, uuid",
      purchaseOrders: "++id, corporationId, uuid",
      stockReceiptNotes: "++id, corporationId, uuid",
      changeOrders: "++id, corporationId, uuid",
      stockReturnNotes: "++id, corporationId, uuid",
      approvalChecks: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
    // v14: Add terms and conditions table
    this.version(14).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      freight: "++id, corporationId, uuid",
      shipVia: "++id, corporationId, uuid",
      locations: "++id, corporationId, uuid",
      purchaseOrders: "++id, corporationId, uuid",
      stockReceiptNotes: "++id, corporationId, uuid",
      changeOrders: "++id, corporationId, uuid",
      stockReturnNotes: "++id, corporationId, uuid",
      approvalChecks: "++id, corporationId, uuid",
      termsAndConditions: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
    // v15: Add charges and sales_tax tables (global)
    this.version(15).stores({
      billEntries: "++id, corporationId, bill_entry_id",
      projects: "++id, corporationId, project_id, id",
      vendors: "++id, corporationId, vendor_id",
      poInstructions: "++id, corporationId, uuid",
      uom: "++id, corporationId, uuid",
      projectTypes: "++id, corporationId, uuid",
      serviceTypes: "++id, corporationId, uuid",
      chartOfAccounts: "++id, corporationId, uuid",
      storageLocations: "++id, corporationId, uuid",
      costCodeDivisions: "++id, corporationId, uuid",
      costCodeConfigurations: "++id, corporationId, uuid",
      corporations: "++id, corporationId, uuid",
      estimates: "++id, corporationId, uuid",
      freight: "++id, corporationId, uuid",
      shipVia: "++id, corporationId, uuid",
      locations: "++id, corporationId, uuid",
      purchaseOrders: "++id, corporationId, uuid",
      stockReceiptNotes: "++id, corporationId, uuid",
      changeOrders: "++id, corporationId, uuid",
      stockReturnNotes: "++id, corporationId, uuid",
      approvalChecks: "++id, corporationId, uuid",
      termsAndConditions: "++id, corporationId, uuid",
      charges: "++id, corporationId, uuid",
      salesTax: "++id, corporationId, uuid",
      syncMetadata: "key, corporationId, dataType, lastSyncedAt",
    });
  }
}

// Create a singleton instance
export const db = new PropertyManagementDB();

// Helper functions for database operations
export const dbHelpers = {
  // Bill Entries
  async saveBillEntries(corporationId: string, entries: any[]) {
    // Clear existing entries for this corporation
    await db.billEntries.where("corporationId").equals(corporationId).delete();

    // Add new entries with corporationId
    const entriesWithCorpId = entries.map((entry) => ({
      ...entry,
      corporationId,
    }));

    await db.billEntries.bulkPut(entriesWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `billEntries_${corporationId}`,
      corporationId,
      dataType: "billEntries",
      lastSyncedAt: new Date(),
    });
  },

  // Freight (global, not tied to corporation)
  async saveFreight(freight: any[]) {
    // @ts-ignore
    await (db as any).freight.clear();
    const withGlobal = freight.map((f: any) => ({
      ...f,
      corporationId: "global",
    }));
    // @ts-ignore
    await (db as any).freight.bulkPut(withGlobal);
    await db.syncMetadata.put({
      key: `freight_global`,
      corporationId: "global",
      dataType: "freight",
      lastSyncedAt: new Date(),
    });
  },

  // Ship Via (global, separate table)
  async saveShipVia(list: any[]) {
    // @ts-ignore
    if ((db as any).shipVia) {
      // @ts-ignore
      await (db as any).shipVia.clear();
      const withGlobal = list.map((f: any) => ({
        ...f,
        corporationId: "global",
      }));
      // @ts-ignore
      await (db as any).shipVia.bulkPut(withGlobal);
      await db.syncMetadata.put({
        key: `shipVia_global`,
        corporationId: "global",
        dataType: "shipVia",
        lastSyncedAt: new Date(),
      });
    }
  },
  async getShipVia() {
    // @ts-ignore
    return (db as any).shipVia ? await (db as any).shipVia.toArray() : [];
  },
  // Locations (global)
  async saveLocations(list: any[]) {
    // @ts-ignore
    if ((db as any).locations) {
      // @ts-ignore
      await (db as any).locations.clear();
      const withGlobal = list.map((r: any) => ({
        ...r,
        corporationId: "global",
      }));
      // @ts-ignore
      await (db as any).locations.bulkPut(withGlobal);
      await db.syncMetadata.put({
        key: `locations_global`,
        corporationId: "global",
        dataType: "locations",
        lastSyncedAt: new Date(),
      });
    }
  },
  async getLocations() {
    // @ts-ignore
    return (db as any).locations ? await (db as any).locations.toArray() : [];
  },
  async addLocation(record: any) {
    // @ts-ignore
    if ((db as any).locations) {
      // @ts-ignore
      await (db as any).locations.add({ ...record, corporationId: "global" });
      await db.syncMetadata.put({
        key: `locations_global`,
        corporationId: "global",
        dataType: "locations",
        lastSyncedAt: new Date(),
      });
    }
  },
  async updateLocation(record: any) {
    // @ts-ignore
    if ((db as any).locations) {
      // @ts-ignore
      const existing = await (db as any).locations
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === record.uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).locations.update(existing.id!, {
          ...record,
          corporationId: "global",
        });
      } else {
        // @ts-ignore
        await (db as any).locations.add({ ...record, corporationId: "global" });
      }
      await db.syncMetadata.put({
        key: `locations_global`,
        corporationId: "global",
        dataType: "locations",
        lastSyncedAt: new Date(),
      });
    }
  },
  async deleteLocation(uuid: string) {
    // @ts-ignore
    if ((db as any).locations) {
      // @ts-ignore
      const existing = await (db as any).locations
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).locations.delete(existing.id!);
      }
      await db.syncMetadata.put({
        key: `locations_global`,
        corporationId: "global",
        dataType: "locations",
        lastSyncedAt: new Date(),
      });
    }
  },
  async addShipVia(record: any) {
    // @ts-ignore
    if ((db as any).shipVia) {
      // @ts-ignore
      await (db as any).shipVia.add({ ...record, corporationId: "global" });
      await db.syncMetadata.put({
        key: `shipVia_global`,
        corporationId: "global",
        dataType: "shipVia",
        lastSyncedAt: new Date(),
      });
    }
  },
  async updateShipVia(record: any) {
    // @ts-ignore
    if ((db as any).shipVia) {
      // @ts-ignore
      const existing = await (db as any).shipVia
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === record.uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).shipVia.update(existing.id!, {
          ...record,
          corporationId: "global",
        });
      } else {
        // @ts-ignore
        await (db as any).shipVia.add({ ...record, corporationId: "global" });
      }
      await db.syncMetadata.put({
        key: `shipVia_global`,
        corporationId: "global",
        dataType: "shipVia",
        lastSyncedAt: new Date(),
      });
    }
  },
  async deleteShipVia(uuid: string) {
    // @ts-ignore
    if ((db as any).shipVia) {
      // @ts-ignore
      const existing = await (db as any).shipVia
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).shipVia.delete(existing.id!);
      }
      await db.syncMetadata.put({
        key: `shipVia_global`,
        corporationId: "global",
        dataType: "shipVia",
        lastSyncedAt: new Date(),
      });
    }
  },

  // Approval Checks (global, separate table)
  async saveApprovalChecks(list: any[]) {
    // @ts-ignore
    if ((db as any).approvalChecks) {
      // @ts-ignore
      await (db as any).approvalChecks.clear();
      const withGlobal = list.map((f: any) => ({
        ...f,
        corporationId: "global",
      }));
      // @ts-ignore
      await (db as any).approvalChecks.bulkPut(withGlobal);
      await db.syncMetadata.put({
        key: `approvalChecks_global`,
        corporationId: "global",
        dataType: "approvalChecks",
        lastSyncedAt: new Date(),
      });
    }
  },
  async getApprovalChecks() {
    // @ts-ignore
    return (db as any).approvalChecks ? await (db as any).approvalChecks.toArray() : [];
  },
  async addApprovalCheck(record: any) {
    // @ts-ignore
    if ((db as any).approvalChecks) {
      // @ts-ignore
      await (db as any).approvalChecks.add({ ...record, corporationId: "global" });
      await db.syncMetadata.put({
        key: `approvalChecks_global`,
        corporationId: "global",
        dataType: "approvalChecks",
        lastSyncedAt: new Date(),
      });
    }
  },
  async updateApprovalCheck(record: any) {
    // @ts-ignore
    if ((db as any).approvalChecks) {
      // @ts-ignore
      const existing = await (db as any).approvalChecks
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === record.uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).approvalChecks.update(existing.id!, {
          ...record,
          corporationId: "global",
        });
      } else {
        // @ts-ignore
        await (db as any).approvalChecks.add({ ...record, corporationId: "global" });
      }
      await db.syncMetadata.put({
        key: `approvalChecks_global`,
        corporationId: "global",
        dataType: "approvalChecks",
        lastSyncedAt: new Date(),
      });
    }
  },
  async deleteApprovalCheck(uuid: string) {
    // @ts-ignore
    if ((db as any).approvalChecks) {
      // @ts-ignore
      const existing = await (db as any).approvalChecks
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).approvalChecks.delete(existing.id!);
      }
      await db.syncMetadata.put({
        key: `approvalChecks_global`,
        corporationId: "global",
        dataType: "approvalChecks",
        lastSyncedAt: new Date(),
      });
    }
  },

  // UOM (global, separate table)
  async saveUOMGlobal(list: any[]) {
    // @ts-ignore
    if ((db as any).uom) {
      // Clear all UOM (since it's global now)
      // @ts-ignore
      await (db as any).uom.clear();
      const withGlobal = list.map((f: any) => ({
        ...f,
        corporationId: "global",
      }));
      // @ts-ignore
      await (db as any).uom.bulkPut(withGlobal);
      await db.syncMetadata.put({
        key: `uom_global`,
        corporationId: "global",
        dataType: "uom",
        lastSyncedAt: new Date(),
      });
    }
  },
  async getUOMGlobal() {
    // @ts-ignore
    return (db as any).uom ? await (db as any).uom.where("corporationId").equals("global").toArray() : [];
  },
  async addUOMGlobal(record: any) {
    // @ts-ignore
    if ((db as any).uom) {
      // @ts-ignore
      await (db as any).uom.add({ ...record, corporationId: "global" });
      await db.syncMetadata.put({
        key: `uom_global`,
        corporationId: "global",
        dataType: "uom",
        lastSyncedAt: new Date(),
      });
    }
  },
  async updateUOMGlobal(record: any) {
    // @ts-ignore
    if ((db as any).uom) {
      // @ts-ignore
      const existing = await (db as any).uom
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === record.uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).uom.update(existing.id!, {
          ...record,
          corporationId: "global",
        });
      } else {
        // @ts-ignore
        await (db as any).uom.add({ ...record, corporationId: "global" });
      }
      await db.syncMetadata.put({
        key: `uom_global`,
        corporationId: "global",
        dataType: "uom",
        lastSyncedAt: new Date(),
      });
    }
  },
  async deleteUOMGlobal(uuid: string) {
    // @ts-ignore
    if ((db as any).uom) {
      // @ts-ignore
      const existing = await (db as any).uom
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).uom.delete(existing.id!);
      }
      await db.syncMetadata.put({
        key: `uom_global`,
        corporationId: "global",
        dataType: "uom",
        lastSyncedAt: new Date(),
      });
    }
  },

  // Charges (global, separate table)
  async saveChargesGlobal(list: any[]) {
    // @ts-ignore
    if ((db as any).charges) {
      // Clear all charges (since it's global now)
      // @ts-ignore
      await (db as any).charges.clear();
      const withGlobal = list.map((f: any) => ({
        ...f,
        corporationId: "global",
      }));
      // @ts-ignore
      await (db as any).charges.bulkPut(withGlobal);
      await db.syncMetadata.put({
        key: `charges_global`,
        corporationId: "global",
        dataType: "charges",
        lastSyncedAt: new Date(),
      });
    }
  },
  async getChargesGlobal() {
    // @ts-ignore
    return (db as any).charges ? await (db as any).charges.where("corporationId").equals("global").toArray() : [];
  },
  async addChargeGlobal(record: any) {
    // @ts-ignore
    if ((db as any).charges) {
      // @ts-ignore
      await (db as any).charges.add({ ...record, corporationId: "global" });
      await db.syncMetadata.put({
        key: `charges_global`,
        corporationId: "global",
        dataType: "charges",
        lastSyncedAt: new Date(),
      });
    }
  },
  async updateChargeGlobal(record: any) {
    // @ts-ignore
    if ((db as any).charges) {
      // @ts-ignore
      const existing = await (db as any).charges
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === record.uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).charges.update(existing.id!, {
          ...record,
          corporationId: "global",
        });
      } else {
        // @ts-ignore
        await (db as any).charges.add({ ...record, corporationId: "global" });
      }
      await db.syncMetadata.put({
        key: `charges_global`,
        corporationId: "global",
        dataType: "charges",
        lastSyncedAt: new Date(),
      });
    }
  },
  async deleteChargeGlobal(uuid: string) {
    // @ts-ignore
    if ((db as any).charges) {
      // @ts-ignore
      const existing = await (db as any).charges
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).charges.delete(existing.id!);
      }
      await db.syncMetadata.put({
        key: `charges_global`,
        corporationId: "global",
        dataType: "charges",
        lastSyncedAt: new Date(),
      });
    }
  },

  // Sales Tax (global, separate table)
  async saveSalesTaxGlobal(list: any[]) {
    // @ts-ignore
    if ((db as any).salesTax) {
      // Clear all sales tax (since it's global now)
      // @ts-ignore
      await (db as any).salesTax.clear();
      const withGlobal = list.map((f: any) => ({
        ...f,
        corporationId: "global",
      }));
      // @ts-ignore
      await (db as any).salesTax.bulkPut(withGlobal);
      await db.syncMetadata.put({
        key: `salesTax_global`,
        corporationId: "global",
        dataType: "salesTax",
        lastSyncedAt: new Date(),
      });
    }
  },
  async getSalesTaxGlobal() {
    // @ts-ignore
    return (db as any).salesTax ? await (db as any).salesTax.where("corporationId").equals("global").toArray() : [];
  },
  async addSalesTaxGlobal(record: any) {
    // @ts-ignore
    if ((db as any).salesTax) {
      // @ts-ignore
      await (db as any).salesTax.add({ ...record, corporationId: "global" });
      await db.syncMetadata.put({
        key: `salesTax_global`,
        corporationId: "global",
        dataType: "salesTax",
        lastSyncedAt: new Date(),
      });
    }
  },
  async updateSalesTaxGlobal(record: any) {
    // @ts-ignore
    if ((db as any).salesTax) {
      // @ts-ignore
      const existing = await (db as any).salesTax
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === record.uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).salesTax.update(existing.id!, {
          ...record,
          corporationId: "global",
        });
      } else {
        // @ts-ignore
        await (db as any).salesTax.add({ ...record, corporationId: "global" });
      }
      await db.syncMetadata.put({
        key: `salesTax_global`,
        corporationId: "global",
        dataType: "salesTax",
        lastSyncedAt: new Date(),
      });
    }
  },
  async deleteSalesTaxGlobal(uuid: string) {
    // @ts-ignore
    if ((db as any).salesTax) {
      // @ts-ignore
      const existing = await (db as any).salesTax
        .where("corporationId")
        .equals("global")
        .and((r: any) => r.uuid === uuid)
        .first();
      if (existing) {
        // @ts-ignore
        await (db as any).salesTax.delete(existing.id!);
      }
      await db.syncMetadata.put({
        key: `salesTax_global`,
        corporationId: "global",
        dataType: "salesTax",
        lastSyncedAt: new Date(),
      });
    }
  },

  async getFreight() {
    // @ts-ignore
    return await (db as any).freight.toArray();
  },

  async addFreight(record: any) {
    const withGlobal = { ...record, corporationId: "global" };
    // @ts-ignore
    await (db as any).freight.add(withGlobal);
    await db.syncMetadata.put({
      key: `freight_global`,
      corporationId: "global",
      dataType: "freight",
      lastSyncedAt: new Date(),
    });
  },

  async updateFreight(record: any) {
    // @ts-ignore
    const existing = await (db as any).freight
      .where("corporationId")
      .equals("global")
      .and((r: any) => r.uuid === record.uuid)
      .first();
    if (existing) {
      // @ts-ignore
      await (db as any).freight.update(existing.id!, {
        ...record,
        corporationId: "global",
      });
    } else {
      // @ts-ignore
      await (db as any).freight.add({ ...record, corporationId: "global" });
    }
    await db.syncMetadata.put({
      key: `freight_global`,
      corporationId: "global",
      dataType: "freight",
      lastSyncedAt: new Date(),
    });
  },

  async deleteFreight(uuid: string) {
    // @ts-ignore
    const existing = await (db as any).freight
      .where("corporationId")
      .equals("global")
      .and((r: any) => r.uuid === uuid)
      .first();
    if (existing) {
      // @ts-ignore
      await (db as any).freight.delete(existing.id!);
    }
    await db.syncMetadata.put({
      key: `freight_global`,
      corporationId: "global",
      dataType: "freight",
      lastSyncedAt: new Date(),
    });
  },

  async getBillEntries(corporationId: string) {
    return await db.billEntries
      .where("corporationId")
      .equals(corporationId)
      .toArray();
  },

  async getAllBillEntries() {
    return await db.billEntries.toArray();
  },

  async addBillEntry(corporationId: string, entry: any) {
    // Add a single bill entry to IndexedDB
    const entryWithCorpId = {
      ...entry,
      corporationId,
    };

    await db.billEntries.add(entryWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `billEntries_${corporationId}`,
      corporationId,
      dataType: "billEntries",
      lastSyncedAt: new Date(),
    });
  },

  async updateBillEntry(corporationId: string, entryId: string, entry: any) {
    // Update a single bill entry in IndexedDB
    const entryWithCorpId = {
      ...entry,
      corporationId,
    };

    // Find the entry by corporationId and bill entry ID
    const existingEntry = await db.billEntries
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.bill_entry_id === entryId)
      .first();

    if (existingEntry) {
      await db.billEntries.update(existingEntry.id!, entryWithCorpId);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `billEntries_${corporationId}`,
      corporationId,
      dataType: "billEntries",
      lastSyncedAt: new Date(),
    });
  },

  async deleteBillEntry(corporationId: string, entryId: string) {
    // Delete a single bill entry from IndexedDB
    const existingEntry = await db.billEntries
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.bill_entry_id === entryId)
      .first();

    if (existingEntry) {
      await db.billEntries.delete(existingEntry.id!);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `billEntries_${corporationId}`,
      corporationId,
      dataType: "billEntries",
      lastSyncedAt: new Date(),
    });
  },

  async addProject(corporationId: string, project: any) {
    const projectWithCorpId = {
      ...project,
      corporationId,
    };

    await db.projects.add(projectWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `projects_${corporationId}`,
      corporationId,
      dataType: "projects",
      lastSyncedAt: new Date(),
    });
  },

  async updateProject(
    corporationId: string,
    projectUuid: string,
    project: any
  ) {
    const projectWithCorpId = {
      ...project,
      corporationId,
    };

    // Find the project by UUID (the database primary key)
    const existingProject = await db.projects
      .where("corporationId")
      .equals(corporationId)
      .filter((project) => project.uuid === projectUuid)
      .first();

    if (existingProject) {
      await db.projects.update(existingProject.id!, projectWithCorpId);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `projects_${corporationId}`,
      corporationId,
      dataType: "projects",
      lastSyncedAt: new Date(),
    });
  },

  async deleteProject(corporationId: string, projectUuid: string) {
    // Find the project by UUID (the database primary key)
    const existingProject = await db.projects
      .where("corporationId")
      .equals(corporationId)
      .filter((project) => project.uuid === projectUuid)
      .first();

    if (existingProject) {
      await db.projects.delete(existingProject.id!);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `projects_${corporationId}`,
      corporationId,
      dataType: "projects",
      lastSyncedAt: new Date(),
    });
  },

  // Projects (bulk operations)
  async saveProjects(corporationId: string, projects: any[]) {
    // Clear existing projects for this corporation
    await db.projects.where("corporationId").equals(corporationId).delete();

    // Add new projects with corporationId
    const projectsWithCorpId = projects.map((project) => ({
      ...project,
      corporationId,
    }));

    await db.projects.bulkPut(projectsWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `projects_${corporationId}`,
      corporationId,
      dataType: "projects",
      lastSyncedAt: new Date(),
    });
  },

  async getProjects(corporationId: string) {
    return await db.projects
      .where("corporationId")
      .equals(corporationId)
      .toArray();
  },

  async getAllProjects() {
    return await db.projects.toArray();
  },

  // Vendors
  async saveVendors(corporationId: string, vendors: any[]) {
    // Clear existing vendors for this corporation
    await db.vendors.where("corporationId").equals(corporationId).delete();

    // Add new vendors with corporationId
    const vendorsWithCorpId = vendors.map((vendor) => ({
      ...vendor,
      corporationId,
    }));

    await db.vendors.bulkPut(vendorsWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `vendors_${corporationId}`,
      corporationId,
      dataType: "vendors",
      lastSyncedAt: new Date(),
    });
  },

  // Project Types
  async saveProjectTypes(corporationId: string, projectTypes: any[]) {
    // Clear existing project types for this corporation
    await db.projectTypes.where("corporationId").equals(corporationId).delete();

    // Add new project types with corporationId
    const projectTypesWithCorpId = projectTypes.map((projectType) => ({
      ...projectType,
      corporationId,
    }));

    await db.projectTypes.bulkPut(projectTypesWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `projectTypes_${corporationId}`,
      corporationId,
      dataType: "projectTypes",
      lastSyncedAt: new Date(),
    });
  },

  async addProjectType(corporationId: string, projectType: any) {
    const projectTypeWithCorpId = {
      ...projectType,
      corporationId,
    };

    await db.projectTypes.add(projectTypeWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `projectTypes_${corporationId}`,
      corporationId,
      dataType: "projectTypes",
      lastSyncedAt: new Date(),
    });
  },

  async updateProjectType(corporationId: string, projectType: any) {
    const projectTypeWithCorpId = {
      ...projectType,
      corporationId,
    };

    // Find existing project type by id
    const existingProjectType = await db.projectTypes
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.id === projectType.id)
      .first();

    if (existingProjectType) {
      await db.projectTypes.update(
        existingProjectType.id!,
        projectTypeWithCorpId
      );
    } else {
      // If not found, add it
      await db.projectTypes.add(projectTypeWithCorpId);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `projectTypes_${corporationId}`,
      corporationId,
      dataType: "projectTypes",
      lastSyncedAt: new Date(),
    });
  },

  async deleteProjectType(corporationId: string, projectTypeId: number) {
    // Delete a single project type from IndexedDB
    const existingProjectType = await db.projectTypes
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.id === projectTypeId)
      .first();

    if (existingProjectType) {
      await db.projectTypes.delete(existingProjectType.id!);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `projectTypes_${corporationId}`,
      corporationId,
      dataType: "projectTypes",
      lastSyncedAt: new Date(),
    });
  },

  // Service Types
  async saveServiceTypes(corporationId: string, serviceTypes: any[]) {
    // Clear existing service types for this corporation
    await db.serviceTypes.where("corporationId").equals(corporationId).delete();

    // Add new service types with corporationId
    const serviceTypesWithCorpId = serviceTypes.map((serviceType) => ({
      ...serviceType,
      corporationId,
    }));

    await db.serviceTypes.bulkPut(serviceTypesWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `serviceTypes_${corporationId}`,
      corporationId,
      dataType: "serviceTypes",
      lastSyncedAt: new Date(),
    });
  },

  async addServiceType(corporationId: string, serviceType: any) {
    const serviceTypeWithCorpId = {
      ...serviceType,
      corporationId,
    };

    await db.serviceTypes.add(serviceTypeWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `serviceTypes_${corporationId}`,
      corporationId,
      dataType: "serviceTypes",
      lastSyncedAt: new Date(),
    });
  },

  async updateServiceType(corporationId: string, serviceType: any) {
    const serviceTypeWithCorpId = {
      ...serviceType,
      corporationId,
    };

    // Find existing service type by id
    const existingServiceType = await db.serviceTypes
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.id === serviceType.id)
      .first();

    if (existingServiceType) {
      await db.serviceTypes.update(
        existingServiceType.id!,
        serviceTypeWithCorpId
      );
    } else {
      // If not found, add it
      await db.serviceTypes.add(serviceTypeWithCorpId);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `serviceTypes_${corporationId}`,
      corporationId,
      dataType: "serviceTypes",
      lastSyncedAt: new Date(),
    });
  },

  async deleteServiceType(corporationId: string, serviceTypeId: number) {
    // Delete a single service type from IndexedDB
    const existingServiceType = await db.serviceTypes
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.id === serviceTypeId)
      .first();

    if (existingServiceType) {
      await db.serviceTypes.delete(existingServiceType.id!);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `serviceTypes_${corporationId}`,
      corporationId,
      dataType: "serviceTypes",
      lastSyncedAt: new Date(),
    });
  },

  async getVendors(corporationId: string) {
    return await db.vendors
      .where("corporationId")
      .equals(corporationId)
      .toArray();
  },

  async getAllVendors() {
    return await db.vendors.toArray();
  },

  // Vendor CRUD operations
  async addVendor(corporationId: string, vendor: any) {
    const vendorWithCorpId = {
      ...vendor,
      corporationId,
    };
    await db.vendors.add(vendorWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `vendors_${corporationId}`,
      corporationId,
      dataType: "vendors",
      lastSyncedAt: new Date(),
    });
  },

  async updateVendor(corporationId: string, vendor: any) {
    const vendorWithCorpId = {
      ...vendor,
      corporationId,
    };
    await db.vendors.put(vendorWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `vendors_${corporationId}`,
      corporationId,
      dataType: "vendors",
      lastSyncedAt: new Date(),
    });
  },

  async deleteVendor(corporationId: string, vendorUuid: string) {
    await db.vendors
      .where("corporationId")
      .equals(corporationId)
      .and((vendor) => vendor.uuid === vendorUuid)
      .delete();

    // Update sync metadata
    await db.syncMetadata.put({
      key: `vendors_${corporationId}`,
      corporationId,
      dataType: "vendors",
      lastSyncedAt: new Date(),
    });
  },

  async deleteAllVendors(corporationId: string) {
    await db.vendors.where("corporationId").equals(corporationId).delete();

    // Update sync metadata
    await db.syncMetadata.put({
      key: `vendors_${corporationId}`,
      corporationId,
      dataType: "vendors",
      lastSyncedAt: new Date(),
    });
  },

  async getProjectTypes(corporationId: string) {
    return await db.projectTypes
      .where("corporationId")
      .equals(corporationId)
      .toArray();
  },

  async getAllProjectTypes() {
    return await db.projectTypes.toArray();
  },

  async getServiceTypes(corporationId: string) {
    return await db.serviceTypes
      .where("corporationId")
      .equals(corporationId)
      .toArray();
  },

  async getAllServiceTypes() {
    return await db.serviceTypes.toArray();
  },

  // Terms and Conditions
  async saveTermsAndConditions(corporationId: string, termsAndConditions: any[]) {
    // Clear existing terms and conditions for this corporation
    await db.termsAndConditions.where("corporationId").equals(corporationId).delete();

    // Add new terms and conditions with corporationId
    const termsAndConditionsWithCorpId = termsAndConditions.map((tc) => ({
      ...tc,
      corporationId,
    }));

    await db.termsAndConditions.bulkPut(termsAndConditionsWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `termsAndConditions_${corporationId}`,
      corporationId,
      dataType: "termsAndConditions",
      lastSyncedAt: new Date(),
    });
  },

  async addTermsAndCondition(corporationId: string, termsAndCondition: any) {
    const termsAndConditionWithCorpId = {
      ...termsAndCondition,
      corporationId,
    };

    await db.termsAndConditions.add(termsAndConditionWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `termsAndConditions_${corporationId}`,
      corporationId,
      dataType: "termsAndConditions",
      lastSyncedAt: new Date(),
    });
  },

  async updateTermsAndCondition(corporationId: string, termsAndCondition: any) {
    const termsAndConditionWithCorpId = {
      ...termsAndCondition,
      corporationId,
    };

    // Find existing terms and condition by id
    const existingTermsAndCondition = await db.termsAndConditions
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.id === termsAndCondition.id)
      .first();

    if (existingTermsAndCondition) {
      await db.termsAndConditions.update(
        existingTermsAndCondition.id!,
        termsAndConditionWithCorpId
      );
    } else {
      // If not found, add it
      await db.termsAndConditions.add(termsAndConditionWithCorpId);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `termsAndConditions_${corporationId}`,
      corporationId,
      dataType: "termsAndConditions",
      lastSyncedAt: new Date(),
    });
  },

  async deleteTermsAndCondition(corporationId: string, termsAndConditionId: number) {
    // Delete a single terms and condition from IndexedDB
    const existingTermsAndCondition = await db.termsAndConditions
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.id === termsAndConditionId)
      .first();

    if (existingTermsAndCondition) {
      await db.termsAndConditions.delete(existingTermsAndCondition.id!);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `termsAndConditions_${corporationId}`,
      corporationId,
      dataType: "termsAndConditions",
      lastSyncedAt: new Date(),
    });
  },

  async getTermsAndConditions(corporationId: string) {
    return await db.termsAndConditions
      .where("corporationId")
      .equals(corporationId)
      .toArray();
  },

  async getAllTermsAndConditions() {
    return await db.termsAndConditions.toArray();
  },

  // PO Instructions
  async savePOInstructions(corporationId: string, poInstructions: any[]) {
    // Clear existing PO instructions for this corporation
    await db.poInstructions
      .where("corporationId")
      .equals(corporationId)
      .delete();

    // Add new PO instructions with corporationId
    const poInstructionsWithCorpId = poInstructions.map((poInstruction) => ({
      ...poInstruction,
      corporationId,
    }));

    await db.poInstructions.bulkPut(poInstructionsWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `poInstructions_${corporationId}`,
      corporationId,
      dataType: "poInstructions",
      lastSyncedAt: new Date(),
    });
  },

  async getPOInstructions(corporationId: string) {
    return await db.poInstructions
      .where("corporationId")
      .equals(corporationId)
      .toArray();
  },

  async getAllPOInstructions() {
    return await db.poInstructions.toArray();
  },

  // UOM
  async saveUOM(corporationId: string, uom: any[]) {
    // Clear existing UOM for this corporation
    await db.uom.where("corporationId").equals(corporationId).delete();

    // Add or update UOM with corporationId
    const uomWithCorpId = uom.map((uomItem) => ({
      ...uomItem,
      corporationId,
    }));

    await db.uom.bulkPut(uomWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `uom_${corporationId}`,
      corporationId,
      dataType: "uom",
      lastSyncedAt: new Date(),
    });
  },

  async getUOM(corporationId: string) {
    return await db.uom.where("corporationId").equals(corporationId).toArray();
  },

  async getAllUOM() {
    return await db.uom.toArray();
  },

  // Chart of Accounts
  async saveChartOfAccounts(corporationId: string, chartOfAccounts: any[]) {
    // Clear existing chart of accounts for this corporation
    await db.chartOfAccounts
      .where("corporationId")
      .equals(corporationId)
      .delete();

    // Add new chart of accounts with corporationId
    const chartOfAccountsWithCorpId = chartOfAccounts.map((account) => ({
      ...account,
      corporationId,
    }));

    await db.chartOfAccounts.bulkPut(chartOfAccountsWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `chartOfAccounts_${corporationId}`,
      corporationId,
      dataType: "chartOfAccounts",
      lastSyncedAt: new Date(),
    });
  },

  async getChartOfAccounts(corporationId: string) {
    return await db.chartOfAccounts
      .where("corporationId")
      .equals(corporationId)
      .toArray();
  },

  async getAllChartOfAccounts() {
    return await db.chartOfAccounts.toArray();
  },

  async addChartOfAccount(corporationId: string, account: any) {
    const accountWithCorpId = {
      ...account,
      corporationId,
    };

    await db.chartOfAccounts.add(accountWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `chartOfAccounts_${corporationId}`,
      corporationId,
      dataType: "chartOfAccounts",
      lastSyncedAt: new Date(),
    });
  },

  async updateChartOfAccount(corporationId: string, account: any) {
    const accountWithCorpId = {
      ...account,
      corporationId,
    };

    // Find existing account by id (chart of accounts uses id, not uuid)
    const existingAccount = await db.chartOfAccounts
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.id === account.id)
      .first();

    if (existingAccount) {
      await db.chartOfAccounts.update(existingAccount.id!, accountWithCorpId);
    } else {
      // If not found, add it
      await db.chartOfAccounts.add(accountWithCorpId);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `chartOfAccounts_${corporationId}`,
      corporationId,
      dataType: "chartOfAccounts",
      lastSyncedAt: new Date(),
    });
  },

  async deleteChartOfAccount(corporationId: string, accountId: number) {
    // Delete a single chart of account from IndexedDB
    const existingAccount = await db.chartOfAccounts
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.id === accountId)
      .first();

    if (existingAccount) {
      await db.chartOfAccounts.delete(existingAccount.id!);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `chartOfAccounts_${corporationId}`,
      corporationId,
      dataType: "chartOfAccounts",
      lastSyncedAt: new Date(),
    });
  },

  // Storage Locations
  async saveStorageLocations(corporationId: string, storageLocations: any[]) {
    // Clear existing storage locations for this corporation
    await db.storageLocations
      .where("corporationId")
      .equals(corporationId)
      .delete();

    // Add new storage locations with corporationId
    const storageLocationsWithCorpId = storageLocations.map((location) => ({
      ...location,
      corporationId,
    }));

    await db.storageLocations.bulkPut(storageLocationsWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `storageLocations_${corporationId}`,
      corporationId,
      dataType: "storageLocations",
      lastSyncedAt: new Date(),
    });
  },

  async getStorageLocations(corporationId: string) {
    return await db.storageLocations
      .where("corporationId")
      .equals(corporationId)
      .toArray();
  },

  async getAllStorageLocations() {
    return await db.storageLocations.toArray();
  },

  async addStorageLocation(corporationId: string, location: any) {
    const locationWithCorpId = {
      ...location,
      corporationId,
    };

    await db.storageLocations.add(locationWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `storageLocations_${corporationId}`,
      corporationId,
      dataType: "storageLocations",
      lastSyncedAt: new Date(),
    });
  },

  async updateStorageLocation(corporationId: string, location: any) {
    const locationWithCorpId = {
      ...location,
      corporationId,
    };

    // Find existing location by uuid
    const existingLocation = await db.storageLocations
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.uuid === location.uuid)
      .first();

    if (existingLocation) {
      await db.storageLocations.update(
        existingLocation.id!,
        locationWithCorpId
      );
    } else {
      // If not found, add it
      await db.storageLocations.add(locationWithCorpId);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `storageLocations_${corporationId}`,
      corporationId,
      dataType: "storageLocations",
      lastSyncedAt: new Date(),
    });
  },

  async deleteStorageLocation(corporationId: string, locationUuid: string) {
    // Delete a single storage location from IndexedDB
    const existingLocation = await db.storageLocations
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.uuid === locationUuid)
      .first();

    if (existingLocation) {
      await db.storageLocations.delete(existingLocation.id!);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `storageLocations_${corporationId}`,
      corporationId,
      dataType: "storageLocations",
      lastSyncedAt: new Date(),
    });
  },

  // Sync Metadata
  async getLastSyncTime(
    corporationId: string,
    dataType:
      | "billEntries"
      | "projects"
      | "vendors"
      | "poInstructions"
      | "uom"
      | "freight"
      | "shipVia"
      | "locations"
      | "projectTypes"
      | "serviceTypes"
      | "chartOfAccounts"
      | "storageLocations"
      | "purchaseOrders"
      | "stockReceiptNotes"
      | "stockReturnNotes"
  ) {
    const metadata = await db.syncMetadata.get(`${dataType}_${corporationId}`);
    return metadata?.lastSyncedAt;
  },

  // Check if data needs syncing (older than 5 minutes or never synced)
  async needsSync(
    corporationId: string,
    dataType:
      | "billEntries"
      | "projects"
      | "vendors"
      | "poInstructions"
      | "uom"
      | "freight"
      | "shipVia"
      | "approvalChecks"
      | "locations"
      | "projectTypes"
      | "serviceTypes"
      | "chartOfAccounts"
      | "storageLocations"
      | "purchaseOrders"
      | "stockReceiptNotes"
      | "stockReturnNotes",
    maxAgeMinutes: number = 5
  ): Promise<boolean> {
    const lastSyncTime = await this.getLastSyncTime(corporationId, dataType);
    if (!lastSyncTime) return true; // Never synced

    const now = new Date();
    const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
    return diffMinutes > maxAgeMinutes;
  },

  // Clear all data (useful for logout)
  async clearAllData() {
    await db.billEntries.clear();
    await db.projects.clear();
    await db.vendors.clear();
    await db.poInstructions.clear();
    await db.uom.clear();
    await db.projectTypes.clear();
    await db.serviceTypes.clear();
    await db.chartOfAccounts.clear();
    await db.storageLocations.clear();
    await db.costCodeDivisions.clear();
    await db.costCodeConfigurations.clear();
    await db.corporations.clear();
    await db.purchaseOrders.clear();
    await db.stockReceiptNotes.clear();
    await db.stockReturnNotes.clear();
    // Clear global freight if present
    // @ts-ignore
    if ((db as any).freight) {
      // @ts-ignore
      await (db as any).freight.clear();
    }
    // Clear global shipVia if present
    // @ts-ignore
    if ((db as any).shipVia) {
      // @ts-ignore
      await (db as any).shipVia.clear();
    }
    // Clear global locations if present
    // @ts-ignore
    if ((db as any).locations) {
      // @ts-ignore
      await (db as any).locations.clear();
    }
    // Clear global approvalChecks if present
    // @ts-ignore
    if ((db as any).approvalChecks) {
      // @ts-ignore
      await (db as any).approvalChecks.clear();
    }
    // Clear global UOM if present (only global ones)
    // @ts-ignore
    if ((db as any).uom) {
      // @ts-ignore
      await (db as any).uom.where("corporationId").equals("global").delete();
    }
    await db.syncMetadata.clear();
  },

  // Clear data for a specific corporation
  async clearCorporationData(corporationId: string) {
    await db.billEntries.where("corporationId").equals(corporationId).delete();
    await db.projects.where("corporationId").equals(corporationId).delete();
    await db.vendors.where("corporationId").equals(corporationId).delete();
    await db.poInstructions
      .where("corporationId")
      .equals(corporationId)
      .delete();
    await db.uom.where("corporationId").equals(corporationId).delete();
    await db.projectTypes.where("corporationId").equals(corporationId).delete();
    await db.serviceTypes.where("corporationId").equals(corporationId).delete();
    await db.chartOfAccounts
      .where("corporationId")
      .equals(corporationId)
      .delete();
    await db.storageLocations
      .where("corporationId")
      .equals(corporationId)
      .delete();
    await db.costCodeDivisions
      .where("corporationId")
      .equals(corporationId)
      .delete();
    await db.costCodeConfigurations
      .where("corporationId")
      .equals(corporationId)
      .delete();
    await db.estimates.where("corporationId").equals(corporationId).delete();
    await db.purchaseOrders.where("corporationId").equals(corporationId).delete();
    await db.changeOrders.where("corporationId").equals(corporationId).delete();
    await db.stockReceiptNotes.where("corporationId").equals(corporationId).delete();
    await db.stockReturnNotes.where("corporationId").equals(corporationId).delete();
    await db.syncMetadata.where("corporationId").equals(corporationId).delete();
  },

  // Cost Code Divisions
  async saveCostCodeDivisions(corporationId: string, divisions: any[]) {
    // Clear existing divisions for this corporation
    await db.costCodeDivisions
      .where("corporationId")
      .equals(corporationId)
      .delete();

    // Add corporationId to each division
    const divisionsWithCorpId = divisions.map((division) => ({
      ...division,
      corporationId,
    }));

    await db.costCodeDivisions.bulkPut(divisionsWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `costCodeDivisions_${corporationId}`,
      corporationId,
      dataType: "costCodeDivisions",
      lastSyncedAt: new Date(),
    });
  },

  async getCostCodeDivisions(corporationId: string): Promise<any[]> {
    const divisions = await db.costCodeDivisions
      .where("corporationId")
      .equals(corporationId)
      .toArray();
    return divisions.map(({ corporationId, ...division }) => division);
  },

  async addCostCodeDivision(corporationId: string, division: any) {
    const divisionWithCorpId = {
      ...division,
      corporationId,
    };

    await db.costCodeDivisions.add(divisionWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `costCodeDivisions_${corporationId}`,
      corporationId,
      dataType: "costCodeDivisions",
      lastSyncedAt: new Date(),
    });
  },

  async updateCostCodeDivision(corporationId: string, division: any) {
    const divisionWithCorpId = {
      ...division,
      corporationId,
    };

    // Find existing division by uuid
    const existingDivision = await db.costCodeDivisions
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.uuid === division.uuid)
      .first();

    if (existingDivision) {
      await db.costCodeDivisions.update(
        existingDivision.id!,
        divisionWithCorpId
      );
    } else {
      // If not found, add it
      await db.costCodeDivisions.add(divisionWithCorpId);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `costCodeDivisions_${corporationId}`,
      corporationId,
      dataType: "costCodeDivisions",
      lastSyncedAt: new Date(),
    });
  },

  async deleteCostCodeDivision(corporationId: string, divisionUuid: string) {
    // Delete a single division from IndexedDB
    const existingDivision = await db.costCodeDivisions
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.uuid === divisionUuid)
      .first();

    if (existingDivision) {
      await db.costCodeDivisions.delete(existingDivision.id!);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `costCodeDivisions_${corporationId}`,
      corporationId,
      dataType: "costCodeDivisions",
      lastSyncedAt: new Date(),
    });
  },

  async deleteAllCostCodeDivisions(corporationId: string) {
    // Delete all divisions for a corporation from IndexedDB
    await db.costCodeDivisions
      .where("corporationId")
      .equals(corporationId)
      .delete();

    // Update sync metadata
    await db.syncMetadata.put({
      key: `costCodeDivisions_${corporationId}`,
      corporationId,
      dataType: "costCodeDivisions",
      lastSyncedAt: new Date(),
    });
  },

  // Cost Code Configurations
  async saveCostCodeConfigurations(
    corporationId: string,
    configurations: any[]
  ) {
    // Clear existing configurations for this corporation
    await db.costCodeConfigurations
      .where("corporationId")
      .equals(corporationId)
      .delete();

    // Add corporationId to each configuration
    const configurationsWithCorpId = configurations.map((configuration) => ({
      ...configuration,
      corporationId,
    }));

    await db.costCodeConfigurations.bulkPut(configurationsWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `costCodeConfigurations_${corporationId}`,
      corporationId,
      dataType: "costCodeConfigurations",
      lastSyncedAt: new Date(),
    });
  },

  async getCostCodeConfigurations(corporationId: string): Promise<any[]> {
    const configurations = await db.costCodeConfigurations
      .where("corporationId")
      .equals(corporationId)
      .toArray();
    return configurations.map(
      ({ corporationId, ...configuration }) => configuration
    );
  },

  async addCostCodeConfiguration(corporationId: string, configuration: any) {
    const configurationWithCorpId = {
      ...configuration,
      corporationId,
    };

    await db.costCodeConfigurations.add(configurationWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `costCodeConfigurations_${corporationId}`,
      corporationId,
      dataType: "costCodeConfigurations",
      lastSyncedAt: new Date(),
    });
  },

  async updateCostCodeConfiguration(corporationId: string, configuration: any) {
    const configurationWithCorpId = {
      ...configuration,
      corporationId,
    };

    // Find existing configuration by uuid
    const existingConfiguration = await db.costCodeConfigurations
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.uuid === configuration.uuid)
      .first();

    if (existingConfiguration) {
      await db.costCodeConfigurations.update(
        existingConfiguration.id!,
        configurationWithCorpId
      );
    } else {
      // If not found, add it
      await db.costCodeConfigurations.add(configurationWithCorpId);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `costCodeConfigurations_${corporationId}`,
      corporationId,
      dataType: "costCodeConfigurations",
      lastSyncedAt: new Date(),
    });
  },

  async deleteCostCodeConfiguration(
    corporationId: string,
    configurationUuid: string
  ) {
    // Delete a single configuration from IndexedDB
    const existingConfiguration = await db.costCodeConfigurations
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.uuid === configurationUuid)
      .first();

    if (existingConfiguration) {
      await db.costCodeConfigurations.delete(existingConfiguration.id!);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `costCodeConfigurations_${corporationId}`,
      corporationId,
      dataType: "costCodeConfigurations",
      lastSyncedAt: new Date(),
    });
  },

  // Corporations
  async saveCorporations(corporations: any[]) {
    // Clear existing corporations
    await db.corporations.clear();

    // Add corporations with a generic corporationId (since corporations are global)
    const corporationsWithCorpId = corporations.map((corporation) => ({
      ...corporation,
      corporationId: "global", // Corporations are global, not per-corporation
    }));

    await db.corporations.bulkPut(corporationsWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `corporations_global`,
      corporationId: "global",
      dataType: "corporations",
      lastSyncedAt: new Date(),
    });
  },

  async getCorporations() {
    return await db.corporations.toArray();
  },

  async addCorporation(corporation: any) {
    const corporationWithCorpId = {
      ...corporation,
      corporationId: "global",
    };
    await db.corporations.add(corporationWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `corporations_global`,
      corporationId: "global",
      dataType: "corporations",
      lastSyncedAt: new Date(),
    });
  },

  async updateCorporation(corporation: any) {
    const corporationWithCorpId = {
      ...corporation,
      corporationId: "global",
    };
    await db.corporations.put(corporationWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `corporations_global`,
      corporationId: "global",
      dataType: "corporations",
      lastSyncedAt: new Date(),
    });
  },

  async deleteCorporation(corporationUuid: string) {
    await db.corporations
      .where("corporationId")
      .equals("global")
      .and((corporation) => corporation.uuid === corporationUuid)
      .delete();

    // Update sync metadata
    await db.syncMetadata.put({
      key: `corporations_global`,
      corporationId: "global",
      dataType: "corporations",
      lastSyncedAt: new Date(),
    });
  },

  async deleteAllCorporations() {
    await db.corporations.clear();

    // Update sync metadata
    await db.syncMetadata.put({
      key: `corporations_global`,
      corporationId: "global",
      dataType: "corporations",
      lastSyncedAt: new Date(),
    });
  },

  // Estimates
  async storeEstimates(estimates: any[]) {
    if (estimates.length === 0) return;

    const corporationId = estimates[0].corporation_uuid;
    if (!corporationId) return;

    // Clear existing estimates for this corporation
    await db.estimates.where("corporationId").equals(corporationId).delete();

    // Deep clone entire estimate objects to ensure all nested arrays/objects are properly serializable
    // This handles any nested structures like material_items within line_items, etc.
    const estimatesWithCorpId = estimates.map((estimate) => {
      // Deep clone the entire estimate object to ensure all nested structures are serializable
      const cloned = JSON.parse(JSON.stringify(estimate));
      // Add corporationId after cloning to avoid issues
      cloned.corporationId = corporationId;
      // Ensure arrays are properly initialized
      if (!Array.isArray(cloned.line_items)) {
        cloned.line_items = [];
      }
      if (!Array.isArray(cloned.attachments)) {
        cloned.attachments = [];
      }
      return cloned;
    });

    await db.estimates.bulkPut(estimatesWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `estimates_${corporationId}`,
      corporationId,
      dataType: "estimates",
      lastSyncedAt: new Date(),
    });
  },

  async getEstimates(corporationId: string): Promise<any[]> {
    const estimates = await db.estimates
      .where("corporationId")
      .equals(corporationId)
      .toArray();
    return estimates.map(({ corporationId, ...estimate }) => estimate);
  },

  async getEstimateByUuid(
    corporationId: string,
    estimateUuid: string
  ): Promise<any | null> {
    const record = await db.estimates
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.uuid === estimateUuid)
      .first();
    if (!record) return null;
    const { corporationId: _corp, ...estimate } = record as any;
    return estimate;
  },

  async addEstimate(corporationId: string, estimate: any) {
    const estimateWithCorpId = {
      ...estimate,
      corporationId,
      // Deep clone line_items array to ensure it's properly serializable
      line_items: estimate.line_items
        ? JSON.parse(JSON.stringify(estimate.line_items))
        : [],
      // Deep clone attachments array to ensure it's properly serializable
      attachments: estimate.attachments
        ? JSON.parse(JSON.stringify(estimate.attachments))
        : [],
      // Deep clone project object if it exists
      project: estimate.project
        ? JSON.parse(JSON.stringify(estimate.project))
        : null,
    };

    await db.estimates.add(estimateWithCorpId);

    // Update sync metadata
    await db.syncMetadata.put({
      key: `estimates_${corporationId}`,
      corporationId,
      dataType: "estimates",
      lastSyncedAt: new Date(),
    });
  },

  async updateEstimate(corporationId: string, estimate: any) {
    const estimateWithCorpId = {
      ...estimate,
      corporationId,
      // Deep clone line_items array to ensure it's properly serializable
      line_items: estimate.line_items
        ? JSON.parse(JSON.stringify(estimate.line_items))
        : [],
      // Deep clone attachments array to ensure it's properly serializable
      attachments: estimate.attachments
        ? JSON.parse(JSON.stringify(estimate.attachments))
        : [],
      // Deep clone project object if it exists
      project: estimate.project
        ? JSON.parse(JSON.stringify(estimate.project))
        : null,
    };

    // Find existing estimate by uuid
    const existingEstimate = await db.estimates
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.uuid === estimate.uuid)
      .first();

    if (existingEstimate) {
      await db.estimates.update(existingEstimate.id!, estimateWithCorpId);
    } else {
      // If not found, add it
      await db.estimates.add(estimateWithCorpId);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `estimates_${corporationId}`,
      corporationId,
      dataType: "estimates",
      lastSyncedAt: new Date(),
    });
  },

  async deleteEstimate(corporationId: string, estimateUuid: string) {
    const estimate = await db.estimates
      .where("corporationId")
      .equals(corporationId)
      .and((item) => item.uuid === estimateUuid)
      .first();

    if (estimate) {
      await db.estimates.delete(estimate.id!);
    }

    // Update sync metadata
    await db.syncMetadata.put({
      key: `estimates_${corporationId}`,
      corporationId,
      dataType: "estimates",
      lastSyncedAt: new Date(),
    });
  },

  async clearEstimates(corporationId: string) {
    await db.estimates.where("corporationId").equals(corporationId).delete();

    // Update sync metadata
    await db.syncMetadata.put({
      key: `estimates_${corporationId}`,
      corporationId,
      dataType: "estimates",
      lastSyncedAt: new Date(),
    });
  },

  // Purchase Orders
  async savePurchaseOrders(corporationId: string, purchaseOrders: any[]) {
    if (!("purchaseOrders" in db)) return;
    // @ts-ignore
    const table = (db as any).purchaseOrders;
    if (!table) return;
    await table.where("corporationId").equals(corporationId).delete();

    // Serialize data to ensure it's IndexedDB-compatible
    const ordersWithCorpId = purchaseOrders.map((po: any) => {
      const serialized = JSON.parse(JSON.stringify(po));
      return {
        ...serialized,
        corporationId,
      };
    });

    if (ordersWithCorpId.length) {
      await table.bulkPut(ordersWithCorpId);
    }

    await db.syncMetadata.put({
      key: `purchaseOrders_${corporationId}`,
      corporationId,
      dataType: "purchaseOrders",
      lastSyncedAt: new Date(),
    });
  },

  async getPurchaseOrders(corporationId: string): Promise<any[]> {
    if (!("purchaseOrders" in db)) return [];
    // @ts-ignore
    const table = (db as any).purchaseOrders;
    if (!table) return [];
    const rows = await table
      .where("corporationId")
      .equals(corporationId)
      .toArray();
    return rows.map(({ corporationId: _corp, ...po }: any) => po);
  },

  async addPurchaseOrder(corporationId: string, purchaseOrder: any) {
    if (!("purchaseOrders" in db)) return;
    // @ts-ignore
    const table = (db as any).purchaseOrders;
    if (!table) return;
    const serialized = JSON.parse(JSON.stringify(purchaseOrder));
    await table.add({
      ...serialized,
      corporationId,
    });
    await db.syncMetadata.put({
      key: `purchaseOrders_${corporationId}`,
      corporationId,
      dataType: "purchaseOrders",
      lastSyncedAt: new Date(),
    });
  },

  async updatePurchaseOrder(corporationId: string, purchaseOrder: any) {
    if (!("purchaseOrders" in db)) return;
    // @ts-ignore
    const table = (db as any).purchaseOrders;
    if (!table) return;
    const existing = await table
      .where("corporationId")
      .equals(corporationId)
      .and((item: any) => item.uuid === purchaseOrder.uuid)
      .first();

    const serialized = JSON.parse(JSON.stringify(purchaseOrder));
    if (existing) {
      await table.update(existing.id!, {
        ...serialized,
        corporationId,
      });
    } else {
      await table.add({
        ...serialized,
        corporationId,
      });
    }

    await db.syncMetadata.put({
      key: `purchaseOrders_${corporationId}`,
      corporationId,
      dataType: "purchaseOrders",
      lastSyncedAt: new Date(),
    });
  },

  async deletePurchaseOrder(corporationId: string, purchaseOrderUuid: string) {
    if (!("purchaseOrders" in db)) return;
    // @ts-ignore
    const table = (db as any).purchaseOrders;
    if (!table) return;
    const existing = await table
      .where("corporationId")
      .equals(corporationId)
      .and((item: any) => item.uuid === purchaseOrderUuid)
      .first();
    if (existing) {
      await table.delete(existing.id!);
    }
    await db.syncMetadata.put({
      key: `purchaseOrders_${corporationId}`,
      corporationId,
      dataType: "purchaseOrders",
      lastSyncedAt: new Date(),
    });
  },

  async clearPurchaseOrders(corporationId: string) {
    if (!("purchaseOrders" in db)) return;
    // @ts-ignore
    const table = (db as any).purchaseOrders;
    if (!table) return;
    await table.where("corporationId").equals(corporationId).delete();
    await db.syncMetadata.put({
      key: `purchaseOrders_${corporationId}`,
      corporationId,
      dataType: "purchaseOrders",
      lastSyncedAt: new Date(),
    });
  },

  // Stock Receipt Notes
  async saveStockReceiptNotes(corporationId: string, notes: any[]) {
    if (!("stockReceiptNotes" in db)) return;
    // @ts-ignore
    const table = (db as any).stockReceiptNotes;
    if (!table) return;
    await table.where("corporationId").equals(corporationId).delete();

    const notesWithCorpId = notes.map((note: any) => ({
      ...note,
      corporationId,
    }));

    if (notesWithCorpId.length) {
      await table.bulkPut(notesWithCorpId);
    }

    await db.syncMetadata.put({
      key: `stockReceiptNotes_${corporationId}`,
      corporationId,
      dataType: "stockReceiptNotes",
      lastSyncedAt: new Date(),
    });
  },

  async getStockReceiptNotes(corporationId: string): Promise<any[]> {
    if (!("stockReceiptNotes" in db)) return [];
    // @ts-ignore
    const table = (db as any).stockReceiptNotes;
    if (!table) return [];
    const rows = await table
      .where("corporationId")
      .equals(corporationId)
      .toArray();
    return rows.map(({ corporationId: _corp, ...note }: any) => note);
  },

  async addStockReceiptNote(corporationId: string, note: any) {
    if (!("stockReceiptNotes" in db)) return;
    // @ts-ignore
    const table = (db as any).stockReceiptNotes;
    if (!table) return;
    await table.add({
      ...note,
      corporationId,
    });
    await db.syncMetadata.put({
      key: `stockReceiptNotes_${corporationId}`,
      corporationId,
      dataType: "stockReceiptNotes",
      lastSyncedAt: new Date(),
    });
  },

  async updateStockReceiptNote(corporationId: string, note: any) {
    if (!("stockReceiptNotes" in db)) return;
    // @ts-ignore
    const table = (db as any).stockReceiptNotes;
    if (!table) return;
    const existing = await table
      .where("corporationId")
      .equals(corporationId)
      .and((item: any) => item.uuid === note.uuid)
      .first();

    if (existing) {
      await table.update(existing.id!, {
        ...note,
        corporationId,
      });
    } else {
      await table.add({
        ...note,
        corporationId,
      });
    }

    await db.syncMetadata.put({
      key: `stockReceiptNotes_${corporationId}`,
      corporationId,
      dataType: "stockReceiptNotes",
      lastSyncedAt: new Date(),
    });
  },

  async deleteStockReceiptNote(corporationId: string, noteUuid: string) {
    if (!("stockReceiptNotes" in db)) return;
    // @ts-ignore
    const table = (db as any).stockReceiptNotes;
    if (!table) return;
    const existing = await table
      .where("corporationId")
      .equals(corporationId)
      .and((item: any) => item.uuid === noteUuid)
      .first();
    if (existing) {
      await table.delete(existing.id!);
    }
    await db.syncMetadata.put({
      key: `stockReceiptNotes_${corporationId}`,
      corporationId,
      dataType: "stockReceiptNotes",
      lastSyncedAt: new Date(),
    });
  },

  async clearStockReceiptNotes(corporationId: string) {
    if (!("stockReceiptNotes" in db)) return;
    // @ts-ignore
    const table = (db as any).stockReceiptNotes;
    if (!table) return;
    await table.where("corporationId").equals(corporationId).delete();
    await db.syncMetadata.put({
      key: `stockReceiptNotes_${corporationId}`,
      corporationId,
      dataType: "stockReceiptNotes",
      lastSyncedAt: new Date(),
    });
  },

  // Change Orders
  async saveChangeOrders(corporationId: string, changeOrders: any[]) {
    if (!("changeOrders" in db)) return;
    // @ts-ignore
    const table = (db as any).changeOrders;
    if (!table) return;
    await table.where("corporationId").equals(corporationId).delete();

    // Serialize data to ensure it's IndexedDB-compatible
    const ordersWithCorpId = changeOrders.map((co: any) => {
      const serialized = JSON.parse(JSON.stringify(co));
      return {
        ...serialized,
        corporationId,
      };
    });

    if (ordersWithCorpId.length) {
      await table.bulkPut(ordersWithCorpId);
    }

    await db.syncMetadata.put({
      key: `changeOrders_${corporationId}`,
      corporationId,
      dataType: "changeOrders",
      lastSyncedAt: new Date(),
    });
  },

  async getChangeOrders(corporationId: string): Promise<any[]> {
    if (!("changeOrders" in db)) return [];
    // @ts-ignore
    const table = (db as any).changeOrders;
    if (!table) return [];
    const rows = await table
      .where("corporationId")
      .equals(corporationId)
      .toArray();
    return rows.map(({ corporationId: _corp, ...co }: any) => co);
  },

  async addChangeOrder(corporationId: string, changeOrder: any) {
    if (!("changeOrders" in db)) return;
    // @ts-ignore
    const table = (db as any).changeOrders;
    if (!table) return;
    const serialized = JSON.parse(JSON.stringify(changeOrder));
    await table.add({
      ...serialized,
      corporationId,
    });
    await db.syncMetadata.put({
      key: `changeOrders_${corporationId}`,
      corporationId,
      dataType: "changeOrders",
      lastSyncedAt: new Date(),
    });
  },

  async updateChangeOrder(corporationId: string, changeOrder: any) {
    if (!("changeOrders" in db)) return;
    // @ts-ignore
    const table = (db as any).changeOrders;
    if (!table) return;
    const existing = await table
      .where("corporationId")
      .equals(corporationId)
      .and((item: any) => item.uuid === changeOrder.uuid)
      .first();

    const serialized = JSON.parse(JSON.stringify(changeOrder));
    if (existing) {
      await table.update(existing.id!, {
        ...serialized,
        corporationId,
      });
    } else {
      await table.add({
        ...serialized,
        corporationId,
      });
    }

    await db.syncMetadata.put({
      key: `changeOrders_${corporationId}`,
      corporationId,
      dataType: "changeOrders",
      lastSyncedAt: new Date(),
    });
  },

  async deleteChangeOrder(corporationId: string, changeOrderUuid: string) {
    if (!("changeOrders" in db)) return;
    // @ts-ignore
    const table = (db as any).changeOrders;
    if (!table) return;
    const existing = await table
      .where("corporationId")
      .equals(corporationId)
      .and((item: any) => item.uuid === changeOrderUuid)
      .first();
    if (existing) {
      await table.delete(existing.id!);
    }
    await db.syncMetadata.put({
      key: `changeOrders_${corporationId}`,
      corporationId,
      dataType: "changeOrders",
      lastSyncedAt: new Date(),
    });
  },

  async clearChangeOrders(corporationId: string) {
    if (!("changeOrders" in db)) return;
    // @ts-ignore
    const table = (db as any).changeOrders;
    if (!table) return;
    await table.where("corporationId").equals(corporationId).delete();
    await db.syncMetadata.put({
      key: `changeOrders_${corporationId}`,
      corporationId,
      dataType: "changeOrders",
      lastSyncedAt: new Date(),
    });
  },

  // Stock Return Notes
  async saveStockReturnNotes(corporationId: string, notes: any[]) {
    if (!("stockReturnNotes" in db)) return;
    // @ts-ignore
    const table = (db as any).stockReturnNotes;
    if (!table) return;
    await table.where("corporationId").equals(corporationId).delete();

    // Serialize data to ensure it's IndexedDB-compatible
    const notesWithCorpId = notes.map((note: any) => {
      const serialized = JSON.parse(JSON.stringify(note));
      return {
        ...serialized,
        corporationId,
      };
    });

    if (notesWithCorpId.length) {
      await table.bulkPut(notesWithCorpId);
    }

    await db.syncMetadata.put({
      key: `stockReturnNotes_${corporationId}`,
      corporationId,
      dataType: "stockReturnNotes",
      lastSyncedAt: new Date(),
    });
  },

  async getStockReturnNotes(corporationId: string): Promise<any[]> {
    if (!("stockReturnNotes" in db)) return [];
    // @ts-ignore
    const table = (db as any).stockReturnNotes;
    if (!table) return [];
    const rows = await table
      .where("corporationId")
      .equals(corporationId)
      .toArray();
    return rows.map(({ corporationId: _corp, ...note }: any) => note);
  },

  async addStockReturnNote(corporationId: string, note: any) {
    if (!("stockReturnNotes" in db)) return;
    // @ts-ignore
    const table = (db as any).stockReturnNotes;
    if (!table) return;
    await table.add({
      ...note,
      corporationId,
    });
    await db.syncMetadata.put({
      key: `stockReturnNotes_${corporationId}`,
      corporationId,
      dataType: "stockReturnNotes",
      lastSyncedAt: new Date(),
    });
  },

  async updateStockReturnNote(corporationId: string, note: any) {
    if (!("stockReturnNotes" in db)) return;
    // @ts-ignore
    const table = (db as any).stockReturnNotes;
    if (!table) return;
    const existing = await table
      .where("corporationId")
      .equals(corporationId)
      .and((n: any) => n.uuid === note.uuid)
      .first();
    if (existing) {
      await table.update(existing.id!, {
        ...note,
        corporationId,
      });
    } else {
      await table.add({
        ...note,
        corporationId,
      });
    }

    await db.syncMetadata.put({
      key: `stockReturnNotes_${corporationId}`,
      corporationId,
      dataType: "stockReturnNotes",
      lastSyncedAt: new Date(),
    });
  },

  async deleteStockReturnNote(corporationId: string, noteUuid: string) {
    if (!("stockReturnNotes" in db)) return;
    // @ts-ignore
    const table = (db as any).stockReturnNotes;
    if (!table) return;
    const existing = await table
      .where("corporationId")
      .equals(corporationId)
      .and((n: any) => n.uuid === noteUuid)
      .first();
    if (existing) {
      await table.delete(existing.id!);
    }
    await db.syncMetadata.put({
      key: `stockReturnNotes_${corporationId}`,
      corporationId,
      dataType: "stockReturnNotes",
      lastSyncedAt: new Date(),
    });
  },

  async clearStockReturnNotes(corporationId: string) {
    if (!("stockReturnNotes" in db)) return;
    // @ts-ignore
    const table = (db as any).stockReturnNotes;
    if (!table) return;
    await table.where("corporationId").equals(corporationId).delete();
    await db.syncMetadata.put({
      key: `stockReturnNotes_${corporationId}`,
      corporationId,
      dataType: "stockReturnNotes",
      lastSyncedAt: new Date(),
    });
  },
};

