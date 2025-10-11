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

describe("Contract Schema Validation", () => {
  describe("PartSchema", () => {
    it("should validate a valid part", () => {
      const validPart = {
        id: "getUserById",
        type: "function",
      };

      const result = PartSchema.safeParse(validPart);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPart);
      }
    });

    it("should reject a part without id", () => {
      const invalidPart = {
        type: "function",
      };

      const result = PartSchema.safeParse(invalidPart);
      expect(result.success).toBe(false);
    });

    it("should reject a part without type", () => {
      const invalidPart = {
        id: "getUserById",
      };

      const result = PartSchema.safeParse(invalidPart);
      expect(result.success).toBe(false);
    });

    it("should reject a part with empty id", () => {
      const invalidPart = {
        id: "",
        type: "function",
      };

      const result = PartSchema.safeParse(invalidPart);
      expect(result.success).toBe(false);
    });
  });

  describe("DependencyPartSchema", () => {
    it("should validate a valid dependency part", () => {
      const validDependencyPart = {
        part_id: "id",
        type: "string",
      };

      const result = DependencyPartSchema.safeParse(validDependencyPart);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validDependencyPart);
      }
    });

    it("should reject a dependency part without part_id", () => {
      const invalidDependencyPart = {
        type: "string",
      };

      const result = DependencyPartSchema.safeParse(invalidDependencyPart);
      expect(result.success).toBe(false);
    });

    it("should reject a dependency part without type", () => {
      const invalidDependencyPart = {
        part_id: "id",
      };

      const result = DependencyPartSchema.safeParse(invalidDependencyPart);
      expect(result.success).toBe(false);
    });
  });

  describe("DependencySchema", () => {
    it("should validate a valid dependency", () => {
      const validDependency = {
        module_id: "users-permissions",
        parts: [
          { part_id: "id", type: "string" },
          { part_id: "name", type: "string" },
        ],
      };

      const result = DependencySchema.safeParse(validDependency);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validDependency);
      }
    });

    it("should reject a dependency without module_id", () => {
      const invalidDependency = {
        parts: [{ part_id: "id", type: "string" }],
      };

      const result = DependencySchema.safeParse(invalidDependency);
      expect(result.success).toBe(false);
    });

    it("should reject a dependency without parts", () => {
      const invalidDependency = {
        module_id: "users-permissions",
      };

      const result = DependencySchema.safeParse(invalidDependency);
      expect(result.success).toBe(false);
    });

    it("should reject a dependency with empty parts array", () => {
      const invalidDependency = {
        module_id: "users-permissions",
        parts: [],
      };

      const result = DependencySchema.safeParse(invalidDependency);
      expect(result.success).toBe(false);
    });
  });

  describe("ContractSchema", () => {
    it("should validate a valid contract with all fields", () => {
      const validContract = {
        id: "users-get",
        type: "controller",
        category: "api",
        description: "Users get endpoint",
        parts: [
          { id: "getUserById", type: "function" },
          { id: "getAllUsers", type: "function" },
        ],
        dependencies: [
          {
            module_id: "users-permissions",
            parts: [
              { part_id: "id", type: "string" },
              { part_id: "name", type: "string" },
            ],
          },
        ],
      };

      const result = ContractSchema.safeParse(validContract);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validContract);
      }
    });

    it("should validate a contract without optional fields", () => {
      const validContract = {
        id: "simple-service",
        type: "service",
        category: "backend",
        description: "A simple service",
      };

      const result = ContractSchema.safeParse(validContract);
      expect(result.success).toBe(true);
    });

    it("should reject a contract without id", () => {
      const invalidContract = {
        type: "controller",
        category: "api",
        description: "Users get endpoint",
      };

      const result = ContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
    });

    it("should reject a contract without type", () => {
      const invalidContract = {
        id: "users-get",
        category: "api",
        description: "Users get endpoint",
      };

      const result = ContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
    });

    it("should reject a contract without category", () => {
      const invalidContract = {
        id: "users-get",
        type: "controller",
        description: "Users get endpoint",
      };

      const result = ContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
    });

    it("should reject a contract without description", () => {
      const invalidContract = {
        id: "users-get",
        type: "controller",
        category: "api",
      };

      const result = ContractSchema.safeParse(invalidContract);
      expect(result.success).toBe(false);
    });
  });

  describe("YAML File Validation", () => {
    it("should validate example-contract.yml from contracts folder", () => {
      const contractsPath = path.join(__dirname, "../../../contracts");
      const filePath = path.join(contractsPath, "example-contract.yml");

      const fileContent = fs.readFileSync(filePath, "utf8");
      const parsedYaml = yaml.load(fileContent);

      const result = ContractSchema.safeParse(parsedYaml);
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
      const contractsPath = path.join(__dirname, "../../../contracts");
      const filePath = path.join(contractsPath, "example-dependency.yml");

      const fileContent = fs.readFileSync(filePath, "utf8");
      const parsedYaml = yaml.load(fileContent);

      const result = ContractSchema.safeParse(parsedYaml);
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

    it("should reject invalid YAML contract", () => {
      const invalidYamlContract = `
id: invalid-contract
type: controller
# Missing required 'category' field
description: This contract is missing category
      `;

      const parsedYaml = yaml.load(invalidYamlContract);
      const result = ContractSchema.safeParse(parsedYaml);
      expect(result.success).toBe(false);
    });

    it("should validate contract dependency relationships", () => {
      const contractsPath = path.join(__dirname, "../../../contracts");

      // Load both contracts
      const dependentContract = yaml.load(
        fs.readFileSync(
          path.join(contractsPath, "example-contract.yml"),
          "utf8",
        ),
      ) as Contract;

      const dependencyContract = yaml.load(
        fs.readFileSync(
          path.join(contractsPath, "example-dependency.yml"),
          "utf8",
        ),
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

    it("should detect type mismatch in dependencies", () => {
      const contractWithTypeMismatch = {
        id: "test-contract",
        type: "controller",
        category: "api",
        description: "Test contract",
        dependencies: [
          {
            module_id: "users-permissions",
            parts: [
              // This has type 'function' but should be 'string' based on example-dependency.yml
              { part_id: "id", type: "function" },
            ],
          },
        ],
      };

      // The schema will validate the structure but not semantic type matching
      const result = ContractSchema.safeParse(contractWithTypeMismatch);
      expect(result.success).toBe(true);

      // To detect semantic mismatches, we need to compare against actual contracts
      const contractsPath = path.join(__dirname, "../../../contracts");
      const dependencyContract = yaml.load(
        fs.readFileSync(
          path.join(contractsPath, "example-dependency.yml"),
          "utf8",
        ),
      ) as Contract;

      const dep = contractWithTypeMismatch.dependencies[0];
      const referencedPart = dep.parts[0];
      const actualPart = dependencyContract.parts?.find(
        (p) => p.id === referencedPart.part_id,
      );

      // This check would fail - types don't match
      expect(actualPart?.type).not.toBe(referencedPart.type);
    });
  });
});
