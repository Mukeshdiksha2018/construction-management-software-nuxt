import { describe, it, expect } from 'vitest'

/**
 * CSV Validation Tests for Chart of Accounts Import
 * 
 * These tests validate the CSV parsing and transformation logic
 * that handles hierarchical account structures, account type validation,
 * and various balance formats including parentheses notation.
 */

describe("Chart of Accounts CSV Validation", () => {
  // Simplified validation function for testing
  function validateAndTransformCSV(data: any[]) {
    const errors: string[] = [];
    const validData: any[] = [];

    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because index starts at 0 and we have header

      const code = row["Code"] || row["Account Code"] || row["code"];
      const accountName = row["Account Name"] || row["account_name"];
      const parentAccount =
        row["Category"] || row["Parent Account"] || row["parent_account"] || "";
      const accountType = row["Account Type"] || row["account_type"] || "";

      if (!code || !accountName) {
        const errorMsg = `Row ${rowNumber}: Missing required fields (Code, Account Name). Found: Code=${code}, Account Name=${accountName}`;
        errors.push(errorMsg);
        return;
      }

      if (!accountType || accountType.toString().trim() === "") {
        const errorMsg = `Row ${rowNumber}: Account Type is required. Skipping row.`;
        errors.push(errorMsg);
        return;
      }

      const validAccountTypes = [
        "Asset",
        "Liability",
        "Equity",
        "Revenue",
        "Expense",
      ];
      const trimmedAccountType = accountType.toString().trim();
      if (!validAccountTypes.includes(trimmedAccountType)) {
        const errorMsg = `Row ${rowNumber}: Account Type "${accountType}" is not valid. Must be one of: ${validAccountTypes.join(
          ", "
        )}`;
        errors.push(errorMsg);
        return;
      }

      // Parse opening balance
      const openingBalanceStr =
        row["Opening Balance"] ||
        row["opening_balance"] ||
        row["Opening_Balance"] ||
        "0";
      let openingBalance = 0;

      if (openingBalanceStr && openingBalanceStr.toString().trim() !== "") {
        let balanceStr = openingBalanceStr.toString().trim();

        // Check for parentheses (accounting notation for negative numbers)
        const isNegative =
          balanceStr.startsWith("(") && balanceStr.endsWith(")");

        if (isNegative) {
          balanceStr = balanceStr.substring(1, balanceStr.length - 1);
        }

        const cleanedBalance = balanceStr.replace(/,/g, "");
        openingBalance = parseFloat(cleanedBalance);

        if (isNaN(openingBalance)) {
          const errorMsg = `Row ${rowNumber}: Invalid opening balance "${openingBalanceStr}". Must be a valid number.`;
          errors.push(errorMsg);
          return;
        }

        if (isNegative) {
          openingBalance = -Math.abs(openingBalance);
        }
      }

      // Check for duplicate codes
      const existingCode = validData.find((item) => item.code === code);
      if (existingCode) {
        const errorMsg = `Row ${rowNumber}: Duplicate code "${code}" found`;
        errors.push(errorMsg);
        return;
      }

      const notes =
        row["Notes"] ||
        row["Description"] ||
        row["notes"] ||
        row["description"] ||
        "";
      const subCategory = row["Sub-Category"] || row["sub_category"] || "";
      const isHeader = !parentAccount || parentAccount.toString().trim() === "";

      const transformedAccount = {
        code: code.toString().trim(),
        account_name: accountName.toString().trim(),
        account_type: trimmedAccountType,
        parent_account: parentAccount ? parentAccount.toString().trim() : "",
        sub_category: subCategory ? subCategory.toString().trim() : "",
        notes: notes ? notes.toString().trim() : "",
        opening_balance: openingBalance,
        is_header: isHeader,
      };

      validData.push(transformedAccount);
    });

    return { data: validData, errors };
  }

  describe("CSV Validation - Required Fields", () => {
    it("should validate account with all required fields", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Auction Funds",
          "Account Type": "Asset",
          Category: "",
          "Sub-Category": "Current Asset",
          "Opening Balance": "20000.00",
          Description: "Auction funds account",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe("10010");
      expect(result.data[0].account_name).toBe("Auction Funds");
      expect(result.data[0].account_type).toBe("Asset");
      expect(result.data[0].sub_category).toBe("Current Asset");
    });

    it("should reject account without code", () => {
      const data = [
        {
          Code: "",
          "Account Name": "Test Account",
          "Account Type": "Asset",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Missing required fields");
      expect(result.data).toHaveLength(0);
    });

    it("should reject account without account name", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "",
          "Account Type": "Asset",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Missing required fields");
    });

    it("should reject account without account type", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test Account",
          "Account Type": "",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Account Type is required");
    });

    it("should reject account with invalid account type", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test Account",
          "Account Type": "Invalid Type",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("is not valid");
    });
  });

  describe("CSV Validation - Opening Balance Formats", () => {
    it("should parse positive balance without commas", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          "Opening Balance": "5000.00",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].opening_balance).toBe(5000);
    });

    it("should parse positive balance with commas", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          "Opening Balance": "20,000.00",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].opening_balance).toBe(20000);
    });

    it("should parse balance with multiple commas (Indian notation)", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          "Opening Balance": "1,40,000.00",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].opening_balance).toBe(140000);
    });

    it("should parse negative balance with minus sign", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          "Opening Balance": "-5000.00",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].opening_balance).toBe(-5000);
    });

    it("should parse negative balance with parentheses", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          "Opening Balance": "(5000.00)",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].opening_balance).toBe(-5000);
    });

    it("should parse negative balance with parentheses and commas", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          "Opening Balance": "(1,40,000.00)",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].opening_balance).toBe(-140000);
    });

    it("should parse large negative balance with Indian notation", () => {
      const data = [
        {
          Code: "15750",
          "Account Name": "Accumulated Depreciation",
          "Account Type": "Asset",
          "Opening Balance": "(2,59,669.00)",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].opening_balance).toBe(-259669);
    });

    it("should default to zero for empty balance", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          "Opening Balance": "",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].opening_balance).toBe(0);
    });

    it("should reject invalid balance format", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          "Opening Balance": "invalid",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Invalid opening balance");
    });
  });

  describe("CSV Validation - Hierarchical Accounts", () => {
    it("should mark account as header when parent is empty", () => {
      const data = [
        {
          Code: "10020",
          "Account Name": "WEBSTER BANK",
          "Account Type": "Asset",
          Category: "",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].is_header).toBe(true);
      expect(result.data[0].parent_account).toBe("");
    });

    it("should mark account as non-header when parent is provided", () => {
      const data = [
        {
          Code: "10025",
          "Account Name": "WB-0235 Wagner Hospitality",
          "Account Type": "Asset",
          Category: "WEBSTER BANK",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].is_header).toBe(false);
      expect(result.data[0].parent_account).toBe("WEBSTER BANK");
    });
  });

  describe("CSV Validation - Duplicate Detection", () => {
    it("should detect duplicate account codes", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Account 1",
          "Account Type": "Asset",
        },
        {
          Code: "10010",
          "Account Name": "Account 2",
          "Account Type": "Asset",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Duplicate code "10010"');
      expect(result.data).toHaveLength(1); // Only first one should be added
    });
  });

  describe("CSV Validation - Optional Fields", () => {
    it("should accept account without description", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          Description: "",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].notes).toBe("");
    });

    it("should accept account without parent", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          Category: "",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].parent_account).toBe("");
    });

    it("should accept account without opening balance", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].opening_balance).toBe(0);
    });
  });

  describe("CSV Validation - Multiple Accounts", () => {
    it("should validate multiple valid accounts", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Auction Funds",
          "Account Type": "Asset",
          Category: "",
          "Opening Balance": "20,000.00",
        },
        {
          Code: "10020",
          "Account Name": "WEBSTER BANK",
          "Account Type": "Asset",
          Category: "",
          "Opening Balance": "0",
        },
        {
          Code: "15750",
          "Account Name": "Accumulated Depreciation",
          "Account Type": "Asset",
          Category: "",
          "Opening Balance": "(2,59,669.00)",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].opening_balance).toBe(20000);
      expect(result.data[1].opening_balance).toBe(0);
      expect(result.data[2].opening_balance).toBe(-259669);
    });

    it("should handle mixed valid and invalid accounts", () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Valid Account",
          "Account Type": "Asset",
        },
        {
          Code: "",
          "Account Name": "Invalid - No Code",
          "Account Type": "Asset",
        },
        {
          Code: "10030",
          "Account Name": "Another Valid",
          "Account Type": "Revenue",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(1);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].code).toBe("10010");
      expect(result.data[1].code).toBe("10030");
    });
  });

  describe("CSV Validation - Column Name Variations", () => {
    it('should accept "Account Code" column', () => {
      const data = [
        {
          "Account Code": "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].code).toBe("10010");
    });

    it('should accept "Account Type" column', () => {
      const data = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].account_type).toBe("Asset");
    });

    it('should accept "Parent Account" column for category', () => {
      const data = [
        {
          Code: "10025",
          "Account Name": "Test",
          "Account Type": "Asset",
          "Parent Account": "WEBSTER BANK",
        },
      ];

      const result = validateAndTransformCSV(data);

      expect(result.errors).toHaveLength(0);
      expect(result.data[0].parent_account).toBe("WEBSTER BANK");
    });

    it('should accept "Notes" or "Description" column', () => {
      const data1 = [
        {
          Code: "10010",
          "Account Name": "Test",
          "Account Type": "Asset",
          Notes: "Test notes",
        },
      ];

      const data2 = [
        {
          Code: "10020",
          "Account Name": "Test 2",
          "Account Type": "Asset",
          Description: "Test description",
        },
      ];

      const result1 = validateAndTransformCSV(data1);
      const result2 = validateAndTransformCSV(data2);

      expect(result1.data[0].notes).toBe("Test notes");
      expect(result2.data[0].notes).toBe("Test description");
    });
  });
});

