import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import {
  ContractSchema,
  PartSchema,
  DependencySchema,
  DependencyPartSchema,
  Contract,
} from "./contract.schema";

/**
 * Helper function to load and parse YAML contract files
 */
function loadYamlContract(filename: string): any {
  const testFixturesPath = path.join(__dirname, "test-fixtures");
  const filePath = path.join(testFixturesPath, filename);
  const fileContent = fs.readFileSync(filePath, "utf8");
  return yaml.load(fileContent);
}

/**
 * Helper function to load contract from main contracts folder
 */
function loadMainContract(filename: string): any {
  const contractsPath = path.join(__dirname, "../../../contracts");
  const filePath = path.join(contractsPath, filename);
  const fileContent = fs.readFileSync(filePath, "utf8");
  return yaml.load(fileContent);
}

describe("Contract Schema Validation", () => {
  describe("PartSchema", () => {
    it("should validate a valid part from YAML", () => {
      const contract = loadYamlContract("valid-contract-full.yml");
      const validPart = contract.parts[0]; // getUserById

      const result = PartSchema.safeParse(validPart);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("getUserById");
        expect(result.data.type).toBe("function");
      }
    });

    it("should reject a part without id from YAML", () => {
      const contract = loadYamlContract("invalid-part-without-id.yml");
      const invalidPart = contract.parts[0];

      const result = PartSchema.safeParse(invalidPart);
      expect(result.success).toBe(false);
    });

    it("should reject a part without type from YAML", () => {
      const contract = loadYamlContract("invalid-part-without-type.yml");
      const invalidPart = contract.parts[0];

      const result = PartSchema.safeParse(invalidPart);
      expect(result.success).toBe(false);
    });
  });

  describe("DependencyPartSchema", () => {
    it("should validate a valid dependency part from YAML", () => {
      const contract = loadYamlContract("valid-contract-full.yml");
      const validDependencyPart = contract.dependencies[0].parts[0];

      const result = DependencyPartSchema.safeParse(validDependencyPart);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.part_id).toBe("id");
        expect(result.data.type).toBe("string");
      }
    });

    it("should reject a dependency part without part_id from YAML", () => {
      const invalidDependencyPart = {
        type: "string",
      };

      const result = DependencyPartSchema.safeParse(invalidDependencyPart);
      expect(result.success).toBe(false);
    });

    it("should reject a dependency part without type from YAML", () => {
      const invalidDependencyPart = {
        part_id: "id",
      };

      const result = DependencyPartSchema.safeParse(invalidDependencyPart);
      expect(result.success).toBe(false);
    });
  });

  describe("DependencySchema", () => {
    it("should validate a valid dependency from YAML", () => {
      const contract = loadYamlContract("valid-contract-full.yml");
      const validDependency = contract.dependencies[0];

      const result = DependencySchema.safeParse(validDependency);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.module_id).toBe("users-permissions");
        expect(result.data.parts).toHaveLength(2);
      }
    });

    it("should reject a dependency without module_id from YAML", () => {
      const contract = loadYamlContract(
        "invalid-dependency-without-module-id.yml",
      );
      const invalidDependency = contract.dependencies[0];

      const result = DependencySchema.safeParse(invalidDependency);
      expect(result.success).toBe(false);
    });

    it("should reject a dependency without parts from YAML", () => {
      const contract = loadYamlContract("invalid-dependency-without-parts.yml");
      const invalidDependency = contract.dependencies[0];

      const result = DependencySchema.safeParse(invalidDependency);
      expect(result.success).toBe(false);
    });

    it("should reject a dependency with empty parts array from YAML", () => {
      const contract = loadYamlContract("invalid-dependency-empty-parts.yml");
      const invalidDependency = contract.dependencies[0];

      const result = DependencySchema.safeParse(invalidDependency);
      expect(result.success).toBe(false);
    });
  });

  describe("ContractSchema", () => {
    it("should validate a valid contract with all fields from YAML", () => {
      const validContract = loadYamlContract("valid-contract-full.yml");

      const result = ContractSchema.safeParse(validContract);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("users-get");
        expect(result.data.type).toBe("controller");
        expect(result.data.category).toBe("api");
        expect(result.data.description).toBe("Users get endpoint");
        expect(result.data.parts).toHaveLength(2);
        expect(result.data.dependencies).toHaveLength(1);
      }
    });

    it("should validate a contract without optional fields from YAML", () => {
      const validContract = loadYamlContract("valid-contract-minimal.yml");

      const result = ContractSchema.safeParse(validContract);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("simple-service");
        expect(result.data.type).toBe("service");
        expect(result.data.category).toBe("backend");
        expect(result.data.description).toBe(
          "A simple service without parts or dependencies",
        );
        expect(result.data.parts).toBeUndefined();
        expect(result.data.dependencies).toBeUndefined();
      }
    });

    it("should reject a contract without id from YAML", () => {
      const invalidContract = loadYamlContract("invalid-missing-id.yml");

      const result = ContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
    });

    it("should reject a contract without type from YAML", () => {
      const invalidContract = loadYamlContract("invalid-missing-type.yml");

      const result = ContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
    });

    it("should reject a contract without category from YAML", () => {
      const invalidContract = loadYamlContract("invalid-missing-category.yml");

      const result = ContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
    });

    it("should reject a contract without description from YAML", () => {
      const invalidContract = loadYamlContract(
        "invalid-missing-description.yml",
      );

      const result = ContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
    });
  });

  describe("YAML File Validation - Main Contracts", () => {
    it("should validate example-contract.yml from contracts folder", () => {
      const contract = loadMainContract("example-contract.yml");

      const result = ContractSchema.safeParse(contract);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.id).toBe("users-get");
        expect(result.data.type).toBe("controller");
        expect(result.data.category).toBe("api");
        expect(result.data.description).toBe("Users get endpoint");
        expect(result.data.parts).toHaveLength(2);
        expect(result.data.dependencies).toHaveLength(1);
      }
    });

    it("should validate example-dependency.yml from contracts folder", () => {
      const contract = loadMainContract("example-dependency.yml");

      const result = ContractSchema.safeParse(contract);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.id).toBe("users-permissions");
        expect(result.data.type).toBe("service");
        expect(result.data.category).toBe("service");
        expect(result.data.description).toBe("Users permissions service");
        expect(result.data.parts).toHaveLength(3);
        expect(result.data.dependencies).toBeUndefined();
      }
    });
  });

  describe("Contract Dependency Relationships", () => {
    it("should validate contract dependency relationships from YAML files", () => {
      // Load both contracts from main contracts folder
      const dependentContract = loadMainContract(
        "example-contract.yml",
      ) as Contract;
      const dependencyContract = loadMainContract(
        "example-dependency.yml",
      ) as Contract;

      // Validate both contracts
      const result1 = ContractSchema.safeParse(dependentContract);
      const result2 = ContractSchema.safeParse(dependencyContract);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        // Verify that the dependency reference exists
        const dep = dependentContract.dependencies?.[0];
        expect(dep?.module_id).toBe(dependencyContract.id);

        // Verify that referenced parts exist in the dependency module
        const dependencyPartIds =
          dependencyContract.parts?.map((p) => p.id) || [];
        dep?.parts.forEach((part) => {
          expect(dependencyPartIds).toContain(part.part_id);
        });

        // Verify type matching
        dep?.parts.forEach((referencedPart) => {
          const actualPart = dependencyContract.parts?.find(
            (p) => p.id === referencedPart.part_id,
          );
          expect(actualPart).toBeDefined();
          expect(actualPart?.type).toBe(referencedPart.type);
        });
      }
    });

    it("should detect type mismatch in dependencies from YAML files", () => {
      // Load contract with type mismatch from test fixtures
      const contractWithTypeMismatch = loadYamlContract(
        "contract-with-type-mismatch.yml",
      );

      // The schema will validate the structure but not semantic type matching
      const result = ContractSchema.safeParse(contractWithTypeMismatch);
      expect(result.success).toBe(true);

      // To detect semantic mismatches, we need to compare against actual contracts
      const dependencyContract = loadMainContract(
        "example-dependency.yml",
      ) as Contract;

      const dep = contractWithTypeMismatch.dependencies[0];
      const referencedPart = dep.parts[0];
      const actualPart = dependencyContract.parts?.find(
        (p) => p.id === referencedPart.part_id,
      );

      // This check would fail - types don't match
      // The referenced part claims 'id' is a 'function' but it's actually a 'string'
      expect(actualPart?.type).not.toBe(referencedPart.type);
      expect(actualPart?.type).toBe("string");
      expect(referencedPart.type).toBe("function");
    });

    it("should validate all parts are correctly typed in dependency from YAML", () => {
      const dependentContract = loadYamlContract(
        "valid-contract-full.yml",
      ) as Contract;
      const dependencyContract = loadYamlContract(
        "valid-dependency-module.yml",
      ) as Contract;

      // Validate structure
      expect(ContractSchema.safeParse(dependentContract).success).toBe(true);
      expect(ContractSchema.safeParse(dependencyContract).success).toBe(true);

      // Verify each referenced part exists and has matching type
      const dep = dependentContract.dependencies?.[0];
      expect(dep).toBeDefined();

      dep?.parts.forEach((referencedPart) => {
        const actualPart = dependencyContract.parts?.find(
          (p) => p.id === referencedPart.part_id,
        );

        expect(actualPart).toBeDefined();
        expect(actualPart?.id).toBe(referencedPart.part_id);
        expect(actualPart?.type).toBe(referencedPart.type);
      });
    });
  });

  describe("Complex YAML Parsing Scenarios", () => {
    it("should handle contract with multiple dependencies from YAML", () => {
      // This tests that we can parse complex YAML structures
      const contract = loadYamlContract("valid-contract-full.yml");

      expect(contract).toBeDefined();
      expect(contract.id).toBeTruthy();
      expect(contract.dependencies).toBeDefined();
      expect(Array.isArray(contract.dependencies)).toBe(true);

      const result = ContractSchema.safeParse(contract);
      expect(result.success).toBe(true);
    });

    it("should handle contract with multiple parts from YAML", () => {
      const contract = loadYamlContract("valid-dependency-module.yml");

      expect(contract.parts).toBeDefined();
      expect(contract.parts.length).toBeGreaterThan(1);

      const result = ContractSchema.safeParse(contract);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.parts).toHaveLength(3);
        expect(result.data.parts?.[0].id).toBe("id");
        expect(result.data.parts?.[1].id).toBe("name");
        expect(result.data.parts?.[2].id).toBe("checkPermission");
      }
    });

    it("should properly parse and validate nested YAML structures", () => {
      const contract = loadYamlContract("valid-contract-full.yml");

      // Verify nested dependency structure
      expect(contract.dependencies).toBeDefined();
      expect(contract.dependencies[0].parts).toBeDefined();
      expect(Array.isArray(contract.dependencies[0].parts)).toBe(true);

      // Validate entire structure
      const result = ContractSchema.safeParse(contract);
      expect(result.success).toBe(true);

      if (result.success) {
        const firstDep = result.data.dependencies?.[0];
        expect(firstDep?.module_id).toBe("users-permissions");
        expect(firstDep?.parts[0].part_id).toBe("id");
        expect(firstDep?.parts[0].type).toBe("string");
      }
    });
  });
});
