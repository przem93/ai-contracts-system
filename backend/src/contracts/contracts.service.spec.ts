import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ContractsService } from "./contracts.service";
import { Neo4jService } from "../neo4j/neo4j.service";
import { EmbeddingService } from "./embedding.service";
import { Contract } from "./contract.schema";
import { ContractFileDto } from "./dto/contract-response.dto";
import { int as neo4jInt } from "neo4j-driver";
import * as path from "path";
import * as crypto from "crypto";

// Mock @xenova/transformers module
jest.mock("@xenova/transformers", () => ({
  pipeline: jest.fn(),
  env: {
    allowLocalModels: false,
  },
}));

describe("ContractsService", () => {
  let service: ContractsService;
  let configService: ConfigService;
  let neo4jService: Neo4jService;
  let embeddingService: EmbeddingService;
  let mockSession: any;

  beforeEach(async () => {
    // Create a shared mock function for run operations
    const sharedRunMock = jest.fn().mockResolvedValue({ records: [] });

    // Create mock transaction that uses the shared run mock
    const mockTransaction = {
      run: sharedRunMock,
    };

    // Create mock session that also uses the shared run mock
    mockSession = {
      run: sharedRunMock,
      close: jest.fn().mockResolvedValue(undefined),
      executeWrite: jest.fn().mockImplementation(async (fn) => {
        // Execute the transaction function with the mock transaction
        return await fn(mockTransaction);
      }),
      _mockTransaction: mockTransaction,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: Neo4jService,
          useValue: {
            getSession: jest.fn().mockReturnValue(mockSession),
            getDriver: jest.fn(),
          },
        },
        {
          provide: EmbeddingService,
          useValue: {
            initialize: jest.fn().mockResolvedValue(undefined),
            generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
            isReady: jest.fn().mockReturnValue(false), // Default to not ready
          },
        },
      ],
    })
      .setLogger({
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })
      .compile();

    service = module.get<ContractsService>(ContractsService);
    configService = module.get<ConfigService>(ConfigService);
    neo4jService = module.get<Neo4jService>(Neo4jService);
    embeddingService = module.get<EmbeddingService>(EmbeddingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("validateContracts", () => {
    const testFixturesPath = path.join(__dirname, "test-fixtures");

    it("should validate all contracts and return success for valid contracts", async () => {
      const validPattern = path.join(testFixturesPath, "valid-*.yml");
      jest.spyOn(configService, "get").mockReturnValue(validPattern);

      const result = await service.validateContracts();

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.files).toBeDefined();
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files.every((file) => file.valid)).toBe(true);
    });

    it("should detect invalid contracts and return validation errors", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-missing-id.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
      expect(result.files).toBeDefined();
      expect(result.files.length).toBe(1);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
      expect(result.files[0].errors!.length).toBeGreaterThan(0);
      // Check that there's an error message (Zod format may vary)
      expect(result.files[0].errors![0].message).toBeTruthy();
    });

    it("should validate multiple contracts and separate valid from invalid", async () => {
      const mixedPattern = path.join(testFixturesPath, "*.yml");
      jest.spyOn(configService, "get").mockReturnValue(mixedPattern);

      const result = await service.validateContracts();

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.files.length).toBeGreaterThan(0);

      const validFiles = result.files.filter((f) => f.valid);
      const invalidFiles = result.files.filter((f) => !f.valid);

      expect(validFiles.length).toBeGreaterThan(0);
      expect(invalidFiles.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false); // Should be false if any file is invalid
    });

    it("should include file path and name in validation results", async () => {
      const validPattern = path.join(
        testFixturesPath,
        "valid-contract-minimal.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(validPattern);

      const result = await service.validateContracts();

      expect(result.files[0].filePath).toBeDefined();
      expect(result.files[0].fileName).toBe("valid-contract-minimal.yml");
    });

    it("should handle missing CONTRACTS_PATH environment variable", async () => {
      jest.spyOn(configService, "get").mockReturnValue(undefined);

      await expect(service.validateContracts()).rejects.toThrow(
        "CONTRACTS_PATH environment variable is not set",
      );
    });

    it("should return empty array when no contract files found", async () => {
      const nonExistentPattern = path.join(
        testFixturesPath,
        "non-existent-*.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(nonExistentPattern);

      const result = await service.validateContracts();

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.files).toEqual([]);
    });

    it("should detect contracts with missing type field", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-missing-type.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
      // Check that there are validation errors present
      expect(result.files[0].errors!.length).toBeGreaterThan(0);
    });

    it("should detect contracts with missing category field", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-missing-category.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
    });

    it("should detect contracts with missing description field", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-missing-description.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
    });

    it("should detect invalid part definitions without id", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-part-without-id.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
    });

    it("should detect invalid part definitions without type", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-part-without-type.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
    });

    it("should detect invalid dependencies without module_id", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-dependency-without-module-id.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
    });

    it("should detect invalid dependencies without parts", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-dependency-without-parts.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
    });

    it("should detect invalid dependencies with empty parts array", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-dependency-empty-parts.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
    });

    it("should provide detailed error paths for nested validation errors", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-part-without-id.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.files[0].errors).toBeDefined();
      expect(result.files[0].errors!.length).toBeGreaterThan(0);
      expect(result.files[0].errors![0].path).toBeDefined();
      expect(result.files[0].errors![0].message).toBeDefined();
    });

    it("should detect missing module dependencies", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-missing-module-dependency.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
      expect(result.files[0].errors!.length).toBeGreaterThan(0);

      const missingModuleError = result.files[0].errors!.find((err) =>
        err.message.includes("does not exist"),
      );
      expect(missingModuleError).toBeDefined();
      expect(missingModuleError!.message).toContain("non-existent-module");
    });

    it("should detect multiple missing module dependencies", async () => {
      const invalidPattern = path.join(
        testFixturesPath,
        "invalid-multiple-missing-modules.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(invalidPattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files[0].valid).toBe(false);
      expect(result.files[0].errors).toBeDefined();
      expect(result.files[0].errors!.length).toBe(2);

      expect(result.files[0].errors![0].message).toContain(
        "missing-module-one",
      );
      expect(result.files[0].errors![1].message).toContain(
        "missing-module-two",
      );
    });

    it("should pass validation when all referenced modules exist", async () => {
      // This test uses both valid-contract-full.yml (which depends on users-permissions)
      // and valid-dependency-module.yml (which is the users-permissions module)
      const validPattern = path.join(testFixturesPath, "valid-*.yml");
      jest.spyOn(configService, "get").mockReturnValue(validPattern);

      const result = await service.validateContracts();

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.files.every((file) => file.valid)).toBe(true);
    });

    it("should detect dependency part type mismatch", async () => {
      // Use glob pattern to include both files
      const pattern = path.join(
        testFixturesPath,
        "{invalid-dependency-type-mismatch,valid-dependency-module}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) => f.fileName === "invalid-dependency-type-mismatch.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();
      expect(invalidFile!.errors!.length).toBeGreaterThan(0);

      const typeMismatchError = invalidFile!.errors!.find((err) =>
        err.message.includes("Part type mismatch"),
      );
      expect(typeMismatchError).toBeDefined();
      expect(typeMismatchError!.message).toContain("expected");
      expect(typeMismatchError!.message).toContain("string");
      expect(typeMismatchError!.message).toContain("function");
    });

    it("should detect multiple dependency part type mismatches", async () => {
      const pattern = path.join(
        testFixturesPath,
        "{invalid-dependency-multiple-type-mismatches,valid-dependency-module}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) => f.fileName === "invalid-dependency-multiple-type-mismatches.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();

      const typeMismatchErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Part type mismatch"),
      );
      expect(typeMismatchErrors.length).toBe(3);

      // Check that all three mismatches are detected by checking the error paths
      expect(
        typeMismatchErrors.some((err) =>
          err.path.includes("dependencies.0.parts.0.type"),
        ),
      ).toBe(true);
      expect(
        typeMismatchErrors.some((err) =>
          err.path.includes("dependencies.0.parts.1.type"),
        ),
      ).toBe(true);
      expect(
        typeMismatchErrors.some((err) =>
          err.path.includes("dependencies.0.parts.2.type"),
        ),
      ).toBe(true);
    });

    it("should detect non-existent part ID in dependency", async () => {
      const pattern = path.join(
        testFixturesPath,
        "{invalid-dependency-nonexistent-part-id,valid-dependency-module}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) => f.fileName === "invalid-dependency-nonexistent-part-id.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();
      expect(invalidFile!.errors!.length).toBeGreaterThan(0);

      const nonExistentPartError = invalidFile!.errors!.find((err) =>
        err.message.includes("does not exist in module"),
      );
      expect(nonExistentPartError).toBeDefined();
      expect(nonExistentPartError!.message).toContain("nonexistent-part");
      expect(nonExistentPartError!.message).toContain("users-permissions");
      expect(nonExistentPartError!.path).toContain("part_id");
    });

    it("should detect multiple non-existent part IDs in dependencies", async () => {
      const pattern = path.join(
        testFixturesPath,
        "{invalid-dependency-multiple-nonexistent-parts,valid-dependency-module}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) =>
          f.fileName === "invalid-dependency-multiple-nonexistent-parts.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();

      const nonExistentPartErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("does not exist in module"),
      );
      expect(nonExistentPartErrors.length).toBe(3);

      // Verify that all three non-existent parts are detected
      expect(
        nonExistentPartErrors.some((err) =>
          err.message.includes("nonexistent-part-1"),
        ),
      ).toBe(true);
      expect(
        nonExistentPartErrors.some((err) =>
          err.message.includes("nonexistent-part-2"),
        ),
      ).toBe(true);
      expect(
        nonExistentPartErrors.some((err) =>
          err.message.includes("nonexistent-part-3"),
        ),
      ).toBe(true);
    });

    it("should detect both non-existent part IDs and type mismatches", async () => {
      const pattern = path.join(
        testFixturesPath,
        "{invalid-dependency-part-id-and-type-mismatch,valid-dependency-module}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) =>
          f.fileName === "invalid-dependency-part-id-and-type-mismatch.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();
      expect(invalidFile!.errors!.length).toBe(2);

      // Should have one type mismatch error for "id" part
      const typeMismatchError = invalidFile!.errors!.find((err) =>
        err.message.includes("Part type mismatch"),
      );
      expect(typeMismatchError).toBeDefined();
      expect(typeMismatchError!.message).toContain("id");

      // Should have one non-existent part error for "nonexistent-part"
      const nonExistentPartError = invalidFile!.errors!.find((err) =>
        err.message.includes("does not exist in module"),
      );
      expect(nonExistentPartError).toBeDefined();
      expect(nonExistentPartError!.message).toContain("nonexistent-part");
    });

    it("should detect duplicate module IDs across different files", async () => {
      const pattern = path.join(
        testFixturesPath,
        "{invalid-duplicate-module-id-1,invalid-duplicate-module-id-2}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files).toBeDefined();
      expect(result.files.length).toBe(2);

      // Both files should be marked as invalid due to duplicate module ID
      expect(result.files.every((f) => !f.valid)).toBe(true);

      // Check that both files have duplicate module ID error
      const file1 = result.files.find(
        (f) => f.fileName === "invalid-duplicate-module-id-1.yml",
      );
      const file2 = result.files.find(
        (f) => f.fileName === "invalid-duplicate-module-id-2.yml",
      );

      expect(file1).toBeDefined();
      expect(file1!.errors).toBeDefined();
      expect(file1!.errors!.length).toBeGreaterThan(0);

      expect(file2).toBeDefined();
      expect(file2!.errors).toBeDefined();
      expect(file2!.errors!.length).toBeGreaterThan(0);

      // Check that the error message mentions duplicate module ID
      const duplicateError1 = file1!.errors!.find((err) =>
        err.message.includes("Duplicate module id"),
      );
      expect(duplicateError1).toBeDefined();
      expect(duplicateError1!.path).toBe("id");
      expect(duplicateError1!.message).toContain("duplicate-module");
      expect(duplicateError1!.message).toContain(
        "invalid-duplicate-module-id-2.yml",
      );

      const duplicateError2 = file2!.errors!.find((err) =>
        err.message.includes("Duplicate module id"),
      );
      expect(duplicateError2).toBeDefined();
      expect(duplicateError2!.path).toBe("id");
      expect(duplicateError2!.message).toContain("duplicate-module");
      expect(duplicateError2!.message).toContain(
        "invalid-duplicate-module-id-1.yml",
      );
    });

    it("should detect multiple duplicate module IDs in the same validation", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-duplicate-module-id-*.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files).toBeDefined();
      expect(result.files.length).toBe(4);

      // All files should be invalid due to duplicate module IDs
      expect(result.files.every((f) => !f.valid)).toBe(true);

      // Check first pair of duplicates (duplicate-module)
      const file1 = result.files.find(
        (f) => f.fileName === "invalid-duplicate-module-id-1.yml",
      );
      const file2 = result.files.find(
        (f) => f.fileName === "invalid-duplicate-module-id-2.yml",
      );

      expect(
        file1!.errors!.some((e) => e.message.includes("duplicate-module")),
      ).toBe(true);
      expect(
        file2!.errors!.some((e) => e.message.includes("duplicate-module")),
      ).toBe(true);

      // Check second pair of duplicates (another-duplicate)
      const file3 = result.files.find(
        (f) => f.fileName === "invalid-duplicate-module-id-3.yml",
      );
      const file4 = result.files.find(
        (f) => f.fileName === "invalid-duplicate-module-id-4.yml",
      );

      expect(
        file3!.errors!.some((e) => e.message.includes("another-duplicate")),
      ).toBe(true);
      expect(
        file4!.errors!.some((e) => e.message.includes("another-duplicate")),
      ).toBe(true);
    });

    it("should not report duplicate errors for contracts with unique module IDs", async () => {
      const pattern = path.join(testFixturesPath, "valid-*.yml");
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(true);
      expect(result.files.every((f) => f.valid)).toBe(true);

      // Ensure no files have duplicate module ID errors
      result.files.forEach((file) => {
        if (file.errors) {
          expect(
            file.errors.every(
              (err) => !err.message.includes("Duplicate module id"),
            ),
          ).toBe(true);
        }
      });
    });

    it("should provide clear error path for duplicate module ID errors", async () => {
      const pattern = path.join(
        testFixturesPath,
        "{invalid-duplicate-module-id-1,invalid-duplicate-module-id-2}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      const file1 = result.files.find(
        (f) => f.fileName === "invalid-duplicate-module-id-1.yml",
      );

      const duplicateError = file1!.errors!.find((err) =>
        err.message.includes("Duplicate module id"),
      );

      expect(duplicateError).toBeDefined();
      expect(duplicateError!.path).toBe("id");
      expect(duplicateError!.message).toBeTruthy();
    });

    it("should detect duplicate dependencies within a single contract (simple case)", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-duplicate-dependency-simple.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) => f.fileName === "invalid-duplicate-dependency-simple.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();
      expect(invalidFile!.errors!.length).toBeGreaterThan(0);

      const duplicateErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Duplicate dependency"),
      );
      expect(duplicateErrors.length).toBe(2); // Both occurrences should be flagged

      // Verify error message contains the module name
      duplicateErrors.forEach((error) => {
        expect(error.message).toContain("users-permissions");
        expect(error.message).toContain(
          "Each module should be listed only once in dependencies",
        );
        expect(error.path).toMatch(/^dependencies\.\d+\.module_id$/);
      });
    });

    it("should detect multiple duplicate dependencies within a single contract", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-duplicate-dependency-multiple.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) => f.fileName === "invalid-duplicate-dependency-multiple.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();

      const duplicateErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Duplicate dependency"),
      );

      // Should have 4 errors: 2 for users-permissions + 2 for auth-service
      expect(duplicateErrors.length).toBe(4);

      // Check that both duplicate modules are reported
      const usersPermissionsErrors = duplicateErrors.filter((err) =>
        err.message.includes("users-permissions"),
      );
      expect(usersPermissionsErrors.length).toBe(2);

      const authServiceErrors = duplicateErrors.filter((err) =>
        err.message.includes("auth-service"),
      );
      expect(authServiceErrors.length).toBe(2);
    });

    it("should detect triple duplicate dependency within a single contract", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-duplicate-dependency-triple.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) => f.fileName === "invalid-duplicate-dependency-triple.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();

      const duplicateErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Duplicate dependency"),
      );

      // All 3 occurrences should be flagged
      expect(duplicateErrors.length).toBe(3);

      // All should reference the same module
      duplicateErrors.forEach((error) => {
        expect(error.message).toContain("users-permissions");
        expect(error.path).toMatch(/^dependencies\.\d+\.module_id$/);
      });
    });

    it("should not report duplicate dependency errors for contracts with unique dependencies", async () => {
      // Include both the contract and its dependency module for proper validation
      const pattern = path.join(
        testFixturesPath,
        "{valid-contract-full,valid-dependency-module}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(true);
      expect(result.files.every((f) => f.valid)).toBe(true);

      // Ensure no files have duplicate dependency errors
      result.files.forEach((file) => {
        if (file.errors) {
          expect(
            file.errors.every(
              (err) => !err.message.includes("Duplicate dependency"),
            ),
          ).toBe(true);
        }
      });
    });

    it("should provide clear error paths for duplicate dependency errors", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-duplicate-dependency-simple.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      const invalidFile = result.files.find(
        (f) => f.fileName === "invalid-duplicate-dependency-simple.yml",
      );

      const duplicateErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Duplicate dependency"),
      );

      expect(duplicateErrors.length).toBe(2);

      // Check error paths point to the dependencies
      expect(duplicateErrors[0].path).toMatch(/^dependencies\.\d+\.module_id$/);
      expect(duplicateErrors[1].path).toMatch(/^dependencies\.\d+\.module_id$/);

      // Ensure error messages are clear
      duplicateErrors.forEach((error) => {
        expect(error.message).toBeTruthy();
        expect(error.message).toContain("Duplicate dependency");
        expect(error.message).toContain(
          "Each module should be listed only once",
        );
      });
    });

    it("should detect self-dependency (module depending on itself)", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-self-dependency.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) => f.fileName === "invalid-self-dependency.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();
      expect(invalidFile!.errors!.length).toBeGreaterThan(0);

      const selfDependencyError = invalidFile!.errors!.find((err) =>
        err.message.includes("cannot depend on itself"),
      );
      expect(selfDependencyError).toBeDefined();
      expect(selfDependencyError!.message).toContain("self-dependent-module");
      expect(selfDependencyError!.message).toContain(
        "Self-dependencies are not allowed",
      );
      expect(selfDependencyError!.path).toMatch(
        /^dependencies\.\d+\.module_id$/,
      );
    });

    it("should not report self-dependency errors for valid contracts", async () => {
      const pattern = path.join(
        testFixturesPath,
        "{valid-contract-full,valid-dependency-module}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(true);
      expect(result.files.every((f) => f.valid)).toBe(true);

      // Ensure no files have self-dependency errors
      result.files.forEach((file) => {
        if (file.errors) {
          expect(
            file.errors.every(
              (err) => !err.message.includes("cannot depend on itself"),
            ),
          ).toBe(true);
        }
      });
    });

    it("should provide clear error message for self-dependency", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-self-dependency.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      const invalidFile = result.files.find(
        (f) => f.fileName === "invalid-self-dependency.yml",
      );

      const selfDependencyError = invalidFile!.errors!.find((err) =>
        err.message.includes("cannot depend on itself"),
      );

      expect(selfDependencyError).toBeDefined();
      expect(selfDependencyError!.path).toBe("dependencies.0.module_id");
      expect(selfDependencyError!.message).toBeTruthy();
      expect(selfDependencyError!.message).toContain("self-dependent-module");
    });

    it("should detect self-dependency among multiple dependencies", async () => {
      const pattern = path.join(
        testFixturesPath,
        "{invalid-self-dependency-with-others,valid-dependency-module,simple-service}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) => f.fileName === "invalid-self-dependency-with-others.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();

      const selfDependencyError = invalidFile!.errors!.find((err) =>
        err.message.includes("cannot depend on itself"),
      );
      expect(selfDependencyError).toBeDefined();
      expect(selfDependencyError!.message).toContain("complex-self-dependent");
      expect(selfDependencyError!.path).toBe("dependencies.1.module_id");
    });

    it("should detect duplicate part_id within a single dependency (simple case)", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-duplicate-parts-in-dependency-simple.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) =>
          f.fileName === "invalid-duplicate-parts-in-dependency-simple.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();
      expect(invalidFile!.errors!.length).toBeGreaterThan(0);

      const duplicatePartErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Duplicate part_id"),
      );
      expect(duplicatePartErrors.length).toBe(2); // Both occurrences should be flagged

      // Verify error message contains the part_id and module name
      duplicatePartErrors.forEach((error) => {
        expect(error.message).toContain("id");
        expect(error.message).toContain("users-permissions");
        expect(error.message).toContain(
          "Each part should be referenced only once per dependency",
        );
        expect(error.path).toMatch(/^dependencies\.0\.parts\.\d+\.part_id$/);
      });
    });

    it("should detect multiple duplicate part_ids within a single dependency", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-duplicate-parts-in-dependency-multiple.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) =>
          f.fileName === "invalid-duplicate-parts-in-dependency-multiple.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();

      const duplicatePartErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Duplicate part_id"),
      );

      // Should have 4 errors: 2 for "id" + 2 for "name"
      expect(duplicatePartErrors.length).toBe(4);

      // Check that both duplicate part_ids are reported
      const idErrors = duplicatePartErrors.filter((err) =>
        err.message.includes('part_id "id"'),
      );
      expect(idErrors.length).toBe(2);

      const nameErrors = duplicatePartErrors.filter((err) =>
        err.message.includes('part_id "name"'),
      );
      expect(nameErrors.length).toBe(2);
    });

    it("should detect triple occurrence of same part_id within a dependency", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-duplicate-parts-in-dependency-triple.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) =>
          f.fileName === "invalid-duplicate-parts-in-dependency-triple.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();

      const duplicatePartErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Duplicate part_id"),
      );

      // All 3 occurrences should be flagged
      expect(duplicatePartErrors.length).toBe(3);

      // All should reference the same part_id
      duplicatePartErrors.forEach((error) => {
        expect(error.message).toContain('part_id "id"');
        expect(error.path).toMatch(/^dependencies\.0\.parts\.\d+\.part_id$/);
      });
    });

    it("should detect duplicate parts across multiple dependencies independently", async () => {
      const pattern = path.join(
        testFixturesPath,
        "{invalid-duplicate-parts-across-multiple-dependencies,valid-dependency-module,simple-service}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find(
        (f) =>
          f.fileName ===
          "invalid-duplicate-parts-across-multiple-dependencies.yml",
      );
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.valid).toBe(false);
      expect(invalidFile!.errors).toBeDefined();

      const duplicatePartErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Duplicate part_id"),
      );

      // Should have 4 errors: 2 in first dependency + 2 in second dependency
      expect(duplicatePartErrors.length).toBe(4);

      // Check errors for first dependency (users-permissions)
      const dep0Errors = duplicatePartErrors.filter((err) =>
        err.path.startsWith("dependencies.0."),
      );
      expect(dep0Errors.length).toBe(2);
      dep0Errors.forEach((error) => {
        expect(error.message).toContain("users-permissions");
      });

      // Check errors for second dependency (simple-service)
      const dep1Errors = duplicatePartErrors.filter((err) =>
        err.path.startsWith("dependencies.1."),
      );
      expect(dep1Errors.length).toBe(2);
      dep1Errors.forEach((error) => {
        expect(error.message).toContain("simple-service");
      });
    });

    it("should not report duplicate part errors for contracts with unique parts per dependency", async () => {
      const pattern = path.join(
        testFixturesPath,
        "{valid-contract-full,valid-dependency-module}.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      expect(result.valid).toBe(true);
      expect(result.files.every((f) => f.valid)).toBe(true);

      // Ensure no files have duplicate part_id errors
      result.files.forEach((file) => {
        if (file.errors) {
          expect(
            file.errors.every(
              (err) => !err.message.includes("Duplicate part_id"),
            ),
          ).toBe(true);
        }
      });
    });

    it("should provide clear error paths for duplicate part_id errors", async () => {
      const pattern = path.join(
        testFixturesPath,
        "invalid-duplicate-parts-in-dependency-simple.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(pattern);

      const result = await service.validateContracts();

      const invalidFile = result.files.find(
        (f) =>
          f.fileName === "invalid-duplicate-parts-in-dependency-simple.yml",
      );

      const duplicatePartErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Duplicate part_id"),
      );

      expect(duplicatePartErrors.length).toBe(2);

      // Check error paths point to the dependency parts
      expect(duplicatePartErrors[0].path).toMatch(
        /^dependencies\.0\.parts\.\d+\.part_id$/,
      );
      expect(duplicatePartErrors[1].path).toMatch(
        /^dependencies\.0\.parts\.\d+\.part_id$/,
      );

      // Ensure error messages are clear
      duplicatePartErrors.forEach((error) => {
        expect(error.message).toBeTruthy();
        expect(error.message).toContain("Duplicate part_id");
        expect(error.message).toContain(
          "Each part should be referenced only once per dependency",
        );
      });
    });
  });

  describe("getAllContracts", () => {
    it("should throw error when CONTRACTS_PATH is not set", async () => {
      jest.spyOn(configService, "get").mockReturnValue(undefined);

      await expect(service.getAllContracts()).rejects.toThrow(
        "CONTRACTS_PATH environment variable is not set",
      );
    });
  });

  describe("applyContractsToNeo4j", () => {
    beforeEach(() => {
      // Reset mock session before each test
      mockSession.run.mockClear();
      mockSession.close.mockClear();
      jest.spyOn(neo4jService, "getSession").mockReturnValue(mockSession);
    });

    it("should clear all existing data before applying contracts (reset behavior)", async () => {
      const contractFiles: ContractFileDto[] = [
        {
          fileName: "test-module.yml",
          filePath: "/test/test-module.yml",
          fileHash: "abc123",
          content: {
            id: "test-module",
            type: "service",
            category: "backend",
            description: "Test module",
          },
        },
      ];

      await service.applyContractsToNeo4j(contractFiles);

      // Verify database clearing happens FIRST (before constraint creation)
      expect(mockSession.run.mock.calls[0][0]).toContain(
        "MATCH (n) DETACH DELETE n",
      );

      // Verify constraint creation is called SECOND (after clearing removes duplicates)
      expect(mockSession.run.mock.calls[1][0]).toContain(
        "CREATE CONSTRAINT module_id_unique",
      );

      // Verify executeWrite is called to run data operations in a transaction
      expect(mockSession.executeWrite).toHaveBeenCalled();

      // Verify module creation happens inside transaction (third operation)
      expect(mockSession.run.mock.calls[2][0]).toContain(
        "MERGE (m:Module {module_id: $module_id})",
      );
    });

    it("should successfully apply a contract with module, parts, and dependencies", async () => {
      const contractFiles: ContractFileDto[] = [
        {
          fileName: "users-get.yml",
          filePath: "/test/users-get.yml",
          fileHash: "def456",
          content: {
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
                module_id: "users-service",
                parts: [
                  { part_id: "findUser", type: "function" },
                  { part_id: "listUsers", type: "function" },
                ],
              },
            ],
          },
        },
      ];

      const result = await service.applyContractsToNeo4j(contractFiles);

      expect(result.success).toBe(true);
      expect(result.modulesProcessed).toBe(1);
      expect(result.partsProcessed).toBe(2);
      expect(result.message).toContain("Successfully applied");

      // Verify database was cleared first
      expect(mockSession.run).toHaveBeenCalledWith("MATCH (n) DETACH DELETE n");

      // Verify module creation was called with hash
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m:Module {module_id: $module_id})"),
        expect.objectContaining({
          module_id: "users-get",
          type: "controller",
          category: "api",
          description: "Users get endpoint",
          contractFileHash: "def456",
        }),
      );

      // Verify parts creation was called
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (p:Part {part_id: $part_id"),
        expect.objectContaining({
          part_id: "getUserById",
          module_id: "users-get",
          type: "function",
        }),
      );

      // Verify MODULE_PART relationship was called
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m)-[r:MODULE_PART]->(p)"),
        expect.objectContaining({
          module_id: "users-get",
          part_id: "getUserById",
        }),
      );

      // Verify MODULE_DEPENDENCY relationship was called (without redundant module_id in pattern)
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m)-[r:MODULE_DEPENDENCY]->(d)"),
        expect.objectContaining({
          from_module_id: "users-get",
          to_module_id: "users-service",
          parts: expect.any(String),
        }),
      );

      // Ensure the redundant module_id property is NOT in the relationship pattern
      const dependencyCall = mockSession.run.mock.calls.find(
        (call) => call[0] && call[0].includes("MODULE_DEPENDENCY"),
      );
      expect(dependencyCall[0]).not.toContain("MODULE_DEPENDENCY {module_id:");

      // Verify session was closed
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should successfully apply a contract without parts", async () => {
      const contractFiles: ContractFileDto[] = [
        {
          fileName: "simple-module.yml",
          filePath: "/test/simple-module.yml",
          fileHash: "ghi789",
          content: {
            id: "simple-module",
            type: "service",
            category: "backend",
            description: "Simple service module",
          },
        },
      ];

      const result = await service.applyContractsToNeo4j(contractFiles);

      expect(result.success).toBe(true);
      expect(result.modulesProcessed).toBe(1);
      expect(result.partsProcessed).toBe(0);

      // Verify database was cleared first
      expect(mockSession.run).toHaveBeenCalledWith("MATCH (n) DETACH DELETE n");

      // Verify module creation was called
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m:Module {module_id: $module_id})"),
        expect.objectContaining({
          module_id: "simple-module",
        }),
      );

      // Verify session was closed
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should successfully apply a contract without dependencies", async () => {
      const contractFiles: ContractFileDto[] = [
        {
          fileName: "standalone-module.yml",
          filePath: "/test/standalone-module.yml",
          fileHash: "jkl012",
          content: {
            id: "standalone-module",
            type: "service",
            category: "backend",
            description: "Standalone module with no dependencies",
            parts: [{ id: "part1", type: "function" }],
          },
        },
      ];

      const result = await service.applyContractsToNeo4j(contractFiles);

      expect(result.success).toBe(true);
      expect(result.modulesProcessed).toBe(1);
      expect(result.partsProcessed).toBe(1);

      // Verify MODULE_DEPENDENCY was not called (no dependencies)
      const dependencyCalls = mockSession.run.mock.calls.filter((call) =>
        call[0].includes("MODULE_DEPENDENCY"),
      );
      expect(dependencyCalls.length).toBe(0);

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should successfully apply multiple contracts", async () => {
      const contractFiles: ContractFileDto[] = [
        {
          fileName: "module-1.yml",
          filePath: "/test/module-1.yml",
          fileHash: "hash1",
          content: {
            id: "module-1",
            type: "controller",
            category: "api",
            description: "First module",
            parts: [{ id: "part1", type: "function" }],
          },
        },
        {
          fileName: "module-2.yml",
          filePath: "/test/module-2.yml",
          fileHash: "hash2",
          content: {
            id: "module-2",
            type: "service",
            category: "backend",
            description: "Second module",
            parts: [
              { id: "part1", type: "class" },
              { id: "part2", type: "interface" },
            ],
          },
        },
        {
          fileName: "module-3.yml",
          filePath: "/test/module-3.yml",
          fileHash: "hash3",
          content: {
            id: "module-3",
            type: "component",
            category: "frontend",
            description: "Third module",
          },
        },
      ];

      const result = await service.applyContractsToNeo4j(contractFiles);

      expect(result.success).toBe(true);
      expect(result.modulesProcessed).toBe(3);
      expect(result.partsProcessed).toBe(3);

      // Verify all modules were created
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m:Module {module_id: $module_id})"),
        expect.objectContaining({ module_id: "module-1" }),
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m:Module {module_id: $module_id})"),
        expect.objectContaining({ module_id: "module-2" }),
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m:Module {module_id: $module_id})"),
        expect.objectContaining({ module_id: "module-3" }),
      );

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should handle empty contracts array", async () => {
      const contractFiles: ContractFileDto[] = [];

      const result = await service.applyContractsToNeo4j(contractFiles);

      expect(result.success).toBe(true);
      expect(result.modulesProcessed).toBe(0);
      expect(result.partsProcessed).toBe(0);

      // Verify database was cleared even with empty array
      expect(mockSession.run).toHaveBeenCalledWith("MATCH (n) DETACH DELETE n");

      // Verify session was still closed
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should handle Neo4j errors and return failure", async () => {
      mockSession.run.mockRejectedValueOnce(
        new Error("Neo4j connection failed"),
      );

      const contractFiles: ContractFileDto[] = [
        {
          fileName: "test-module.yml",
          filePath: "/test/test-module.yml",
          fileHash: "errorHash",
          content: {
            id: "test-module",
            type: "service",
            category: "backend",
            description: "Test module",
          },
        },
      ];

      const result = await service.applyContractsToNeo4j(contractFiles);

      expect(result.success).toBe(false);
      expect(result.modulesProcessed).toBe(0);
      expect(result.partsProcessed).toBe(0);
      expect(result.message).toContain("Failed to apply contracts to Neo4j");
      expect(result.message).toContain("Neo4j connection failed");

      // Verify the clearing operation was attempted
      expect(mockSession.run).toHaveBeenCalledWith("MATCH (n) DETACH DELETE n");

      // Verify session was still closed even on error
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should store dependency parts as JSON string", async () => {
      const contractFiles: ContractFileDto[] = [
        {
          fileName: "test-module.yml",
          filePath: "/test/test-module.yml",
          fileHash: "depHash",
          content: {
            id: "test-module",
            type: "controller",
            category: "api",
            description: "Test module with dependencies",
            dependencies: [
              {
                module_id: "dependency-module",
                parts: [
                  { part_id: "function1", type: "function" },
                  { part_id: "class1", type: "class" },
                ],
              },
            ],
          },
        },
      ];

      await service.applyContractsToNeo4j(contractFiles);

      // Find the dependency relationship call
      const dependencyCall = mockSession.run.mock.calls.find((call) =>
        call[0].includes("MODULE_DEPENDENCY"),
      );

      expect(dependencyCall).toBeDefined();
      expect(dependencyCall[1].parts).toBe(
        JSON.stringify([
          { part_id: "function1", type: "function" },
          { part_id: "class1", type: "class" },
        ]),
      );
    });

    it("should close session even if an error occurs during processing", async () => {
      mockSession.run.mockRejectedValueOnce(new Error("Database error"));

      const contractFiles: ContractFileDto[] = [
        {
          fileName: "test-module.yml",
          filePath: "/test/test-module.yml",
          fileHash: "errorHash2",
          content: {
            id: "test-module",
            type: "service",
            category: "backend",
            description: "Test module",
          },
        },
      ];

      await service.applyContractsToNeo4j(contractFiles);

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should process all parts for a module with multiple parts", async () => {
      const contractFiles: ContractFileDto[] = [
        {
          fileName: "multi-part-module.yml",
          filePath: "/test/multi-part-module.yml",
          fileHash: "multiPartHash",
          content: {
            id: "multi-part-module",
            type: "service",
            category: "backend",
            description: "Module with multiple parts",
            parts: [
              { id: "part1", type: "function" },
              { id: "part2", type: "class" },
              { id: "part3", type: "interface" },
              { id: "part4", type: "type" },
            ],
          },
        },
      ];

      const result = await service.applyContractsToNeo4j(contractFiles);

      expect(result.success).toBe(true);
      expect(result.partsProcessed).toBe(4);

      // Verify all parts were created
      const partCreationCalls = mockSession.run.mock.calls.filter((call) =>
        call[0].includes("MERGE (p:Part"),
      );
      expect(partCreationCalls.length).toBe(4);
    });

    it("should process all dependencies for a module with multiple dependencies", async () => {
      const contractFiles: ContractFileDto[] = [
        {
          fileName: "multi-dep-module.yml",
          filePath: "/test/multi-dep-module.yml",
          fileHash: "multiDepHash",
          content: {
            id: "multi-dep-module",
            type: "controller",
            category: "api",
            description: "Module with multiple dependencies",
            dependencies: [
              {
                module_id: "dep1",
                parts: [{ part_id: "func1", type: "function" }],
              },
              {
                module_id: "dep2",
                parts: [{ part_id: "func2", type: "function" }],
              },
              {
                module_id: "dep3",
                parts: [{ part_id: "func3", type: "function" }],
              },
            ],
          },
        },
      ];

      const result = await service.applyContractsToNeo4j(contractFiles);

      expect(result.success).toBe(true);

      // Verify all dependencies were created
      const dependencyCalls = mockSession.run.mock.calls.filter((call) =>
        call[0].includes("MODULE_DEPENDENCY"),
      );
      expect(dependencyCalls.length).toBe(3);
    });

    it("should store contract file hash in Module node", async () => {
      const testHash =
        "a3d2f1e8b9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1";
      const contractFiles: ContractFileDto[] = [
        {
          fileName: "test-module.yml",
          filePath: "/test/test-module.yml",
          fileHash: testHash,
          content: {
            id: "test-module",
            type: "service",
            category: "backend",
            description: "Test module for hash verification",
          },
        },
      ];

      await service.applyContractsToNeo4j(contractFiles);

      // Verify hash was stored in Module node
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("contractFileHash"),
        expect.objectContaining({
          contractFileHash: testHash,
        }),
      );
    });

    it("should store different hashes for different contract files", async () => {
      const contractFiles: ContractFileDto[] = [
        {
          fileName: "module-1.yml",
          filePath: "/test/module-1.yml",
          fileHash: "hash111",
          content: {
            id: "module-1",
            type: "service",
            category: "backend",
            description: "First module",
          },
        },
        {
          fileName: "module-2.yml",
          filePath: "/test/module-2.yml",
          fileHash: "hash222",
          content: {
            id: "module-2",
            type: "controller",
            category: "api",
            description: "Second module",
          },
        },
      ];

      await service.applyContractsToNeo4j(contractFiles);

      // Verify first module has correct hash
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m:Module {module_id: $module_id})"),
        expect.objectContaining({
          module_id: "module-1",
          contractFileHash: "hash111",
        }),
      );

      // Verify second module has correct hash
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m:Module {module_id: $module_id})"),
        expect.objectContaining({
          module_id: "module-2",
          contractFileHash: "hash222",
        }),
      );
    });

    it("should generate and store embeddings when embedding service is ready", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      // Mock embedding service to be ready and return embedding
      jest.spyOn(embeddingService, "isReady").mockReturnValue(true);
      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);

      const contractFiles: ContractFileDto[] = [
        {
          fileName: "test-module.yml",
          filePath: "/test/test-module.yml",
          fileHash: "abc123",
          content: {
            id: "test-module",
            type: "service",
            category: "backend",
            description: "Test module description",
          },
        },
      ];

      await service.applyContractsToNeo4j(contractFiles);

      // Verify generateEmbedding was called with the description
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        "Test module description",
      );

      // Verify module creation was called with embedding
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("m.embedding = $embedding"),
        expect.objectContaining({
          module_id: "test-module",
          description: "Test module description",
          embedding: mockEmbedding,
        }),
      );
    });

    it("should store null embedding when embedding service is not ready", async () => {
      // Mock embedding service to not be ready
      jest.spyOn(embeddingService, "isReady").mockReturnValue(false);

      const contractFiles: ContractFileDto[] = [
        {
          fileName: "test-module.yml",
          filePath: "/test/test-module.yml",
          fileHash: "abc123",
          content: {
            id: "test-module",
            type: "service",
            category: "backend",
            description: "Test module description",
          },
        },
      ];

      await service.applyContractsToNeo4j(contractFiles);

      // Verify generateEmbedding was NOT called
      expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();

      // Verify module creation was called with null embedding
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("m.embedding = $embedding"),
        expect.objectContaining({
          module_id: "test-module",
          description: "Test module description",
          embedding: null,
        }),
      );
    });

    it("should handle embedding generation errors gracefully", async () => {
      // Mock embedding service to be ready but throw error
      jest.spyOn(embeddingService, "isReady").mockReturnValue(true);
      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockRejectedValue(new Error("Embedding generation failed"));

      const contractFiles: ContractFileDto[] = [
        {
          fileName: "test-module.yml",
          filePath: "/test/test-module.yml",
          fileHash: "abc123",
          content: {
            id: "test-module",
            type: "service",
            category: "backend",
            description: "Test module description",
          },
        },
      ];

      const result = await service.applyContractsToNeo4j(contractFiles);

      // Verify the contract was still applied (graceful degradation)
      expect(result.success).toBe(true);
      expect(result.modulesProcessed).toBe(1);

      // Verify module creation was called with null embedding (fallback)
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("m.embedding = $embedding"),
        expect.objectContaining({
          module_id: "test-module",
          description: "Test module description",
          embedding: null,
        }),
      );
    });

    it("should generate embeddings for multiple contracts", async () => {
      const mockEmbedding1 = [0.1, 0.2, 0.3];
      const mockEmbedding2 = [0.4, 0.5, 0.6];

      // Mock embedding service to be ready
      jest.spyOn(embeddingService, "isReady").mockReturnValue(true);
      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValueOnce(mockEmbedding1)
        .mockResolvedValueOnce(mockEmbedding2);

      const contractFiles: ContractFileDto[] = [
        {
          fileName: "module-1.yml",
          filePath: "/test/module-1.yml",
          fileHash: "hash1",
          content: {
            id: "module-1",
            type: "service",
            category: "backend",
            description: "First module description",
          },
        },
        {
          fileName: "module-2.yml",
          filePath: "/test/module-2.yml",
          fileHash: "hash2",
          content: {
            id: "module-2",
            type: "controller",
            category: "api",
            description: "Second module description",
          },
        },
      ];

      await service.applyContractsToNeo4j(contractFiles);

      // Verify generateEmbedding was called for both descriptions
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        "First module description",
      );
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        "Second module description",
      );
      expect(embeddingService.generateEmbedding).toHaveBeenCalledTimes(2);

      // Verify module creation was called with correct embeddings
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("m.embedding = $embedding"),
        expect.objectContaining({
          module_id: "module-1",
          embedding: mockEmbedding1,
        }),
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("m.embedding = $embedding"),
        expect.objectContaining({
          module_id: "module-2",
          embedding: mockEmbedding2,
        }),
      );
    });
  });

  describe("getAllContracts - hash calculation", () => {
    const testFixturesPath = path.join(__dirname, "test-fixtures");

    it("should calculate SHA256 hash for each contract file", async () => {
      const validPattern = path.join(
        testFixturesPath,
        "valid-contract-minimal.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(validPattern);

      const result = await service.getAllContracts();

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].fileHash).toBeDefined();
      expect(result[0].fileHash).toMatch(/^[a-f0-9]{64}$/); // SHA256 produces 64 hex characters
    });

    it("should calculate same hash for same file content", async () => {
      const testContent =
        "id: test\ntype: service\ncategory: backend\ndescription: Test";
      const expectedHash = crypto
        .createHash("sha256")
        .update(testContent)
        .digest("hex");

      const validPattern = path.join(
        testFixturesPath,
        "valid-contract-minimal.yml",
      );
      jest.spyOn(configService, "get").mockReturnValue(validPattern);

      const result1 = await service.getAllContracts();
      const result2 = await service.getAllContracts();

      expect(result1[0].fileHash).toBe(result2[0].fileHash);
    });

    it("should include hash in ContractFileDto", async () => {
      const validPattern = path.join(testFixturesPath, "valid-*.yml");
      jest.spyOn(configService, "get").mockReturnValue(validPattern);

      const result = await service.getAllContracts();

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      result.forEach((contract) => {
        expect(contract.fileName).toBeDefined();
        expect(contract.filePath).toBeDefined();
        expect(contract.content).toBeDefined();
        expect(contract.fileHash).toBeDefined();
        expect(typeof contract.fileHash).toBe("string");
        expect(contract.fileHash.length).toBe(64); // SHA256 hash length
      });
    });

    it("should calculate different hashes for different file contents", async () => {
      const validPattern = path.join(testFixturesPath, "valid-*.yml");
      jest.spyOn(configService, "get").mockReturnValue(validPattern);

      const result = await service.getAllContracts();

      expect(result.length).toBeGreaterThan(1);

      const hashes = result.map((c) => c.fileHash);
      const uniqueHashes = new Set(hashes);

      // All hashes should be unique (different files should have different hashes)
      expect(uniqueHashes.size).toBe(hashes.length);
    });
  });

  describe("checkIfContractsModified", () => {
    beforeEach(() => {
      mockSession.run.mockClear();
      mockSession.close.mockClear();
      jest.spyOn(neo4jService, "getSession").mockReturnValue(mockSession);
    });

    it("should detect no changes when hashes match", async () => {
      const testHash = "abc123hash";
      const testFixturesPath = path.join(__dirname, "test-fixtures");
      const validPattern = path.join(
        testFixturesPath,
        "valid-contract-minimal.yml",
      );

      jest.spyOn(configService, "get").mockReturnValue(validPattern);

      // Mock getAllContracts to return a contract with specific hash
      jest.spyOn(service, "getAllContracts").mockResolvedValue([
        {
          fileName: "valid-contract-minimal.yml",
          filePath: validPattern,
          fileHash: testHash,
          content: {
            id: "test-module",
            type: "service",
            category: "backend",
            description: "Test module",
          },
        },
      ]);

      // Mock Neo4j query to return same hash
      mockSession.run.mockResolvedValue({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "moduleId") return "test-module";
              if (field === "storedHash") return testHash;
              return null;
            }),
          },
        ],
      });

      const result = await service.checkIfContractsModified();

      expect(result.hasChanges).toBe(false);
      expect(result.totalChanges).toBe(0);
      expect(result.modifiedCount).toBe(0);
      expect(result.addedCount).toBe(0);
      expect(result.removedCount).toBe(0);
      expect(result.changes).toEqual([]);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MATCH (m:Module)"),
      );
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should detect modified contracts when hashes differ", async () => {
      const currentHash = "newhash123";
      const storedHash = "oldhash456";
      const testFixturesPath = path.join(__dirname, "test-fixtures");
      const validPattern = path.join(
        testFixturesPath,
        "valid-contract-minimal.yml",
      );

      jest.spyOn(configService, "get").mockReturnValue(validPattern);

      jest.spyOn(service, "getAllContracts").mockResolvedValue([
        {
          fileName: "valid-contract-minimal.yml",
          filePath: validPattern,
          fileHash: currentHash,
          content: {
            id: "test-module",
            type: "service",
            category: "backend",
            description: "Test module",
          },
        },
      ]);

      mockSession.run.mockResolvedValue({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "moduleId") return "test-module";
              if (field === "storedHash") return storedHash;
              return null;
            }),
          },
        ],
      });

      const result = await service.checkIfContractsModified();

      expect(result.hasChanges).toBe(true);
      expect(result.totalChanges).toBe(1);
      expect(result.modifiedCount).toBe(1);
      expect(result.addedCount).toBe(0);
      expect(result.removedCount).toBe(0);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        moduleId: "test-module",
        fileName: "valid-contract-minimal.yml",
        filePath: validPattern,
        currentHash,
        storedHash,
        status: "modified",
      });

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should detect added contracts when no stored hash exists", async () => {
      const currentHash = "newhash789";
      const testFixturesPath = path.join(__dirname, "test-fixtures");
      const validPattern = path.join(
        testFixturesPath,
        "valid-contract-minimal.yml",
      );

      jest.spyOn(configService, "get").mockReturnValue(validPattern);

      jest.spyOn(service, "getAllContracts").mockResolvedValue([
        {
          fileName: "new-contract.yml",
          filePath: "/contracts/new-contract.yml",
          fileHash: currentHash,
          content: {
            id: "new-module",
            type: "service",
            category: "backend",
            description: "New module",
          },
        },
      ]);

      // Mock Neo4j query to return empty result (no stored contracts)
      mockSession.run.mockResolvedValue({
        records: [],
      });

      const result = await service.checkIfContractsModified();

      expect(result.hasChanges).toBe(true);
      expect(result.totalChanges).toBe(1);
      expect(result.modifiedCount).toBe(0);
      expect(result.addedCount).toBe(1);
      expect(result.removedCount).toBe(0);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        moduleId: "new-module",
        fileName: "new-contract.yml",
        filePath: "/contracts/new-contract.yml",
        currentHash,
        storedHash: null,
        status: "added",
      });

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should detect removed contracts when current file does not exist", async () => {
      const storedHash = "removedhash123";

      jest.spyOn(configService, "get").mockReturnValue("/contracts/*.yml");

      // Mock getAllContracts to return empty array (no current contracts)
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);

      // Mock Neo4j query to return a stored contract
      mockSession.run.mockResolvedValue({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "moduleId") return "removed-module";
              if (field === "storedHash") return storedHash;
              return null;
            }),
          },
        ],
      });

      const result = await service.checkIfContractsModified();

      expect(result.hasChanges).toBe(true);
      expect(result.totalChanges).toBe(1);
      expect(result.modifiedCount).toBe(0);
      expect(result.addedCount).toBe(0);
      expect(result.removedCount).toBe(1);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        moduleId: "removed-module",
        fileName: "unknown",
        filePath: "unknown",
        currentHash: "",
        storedHash,
        status: "removed",
      });

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should detect multiple changes at once", async () => {
      jest.spyOn(configService, "get").mockReturnValue("/contracts/*.yml");

      // Mock getAllContracts with 2 contracts: 1 modified, 1 added
      jest.spyOn(service, "getAllContracts").mockResolvedValue([
        {
          fileName: "modified-contract.yml",
          filePath: "/contracts/modified-contract.yml",
          fileHash: "newhash111",
          content: {
            id: "modified-module",
            type: "service",
            category: "backend",
            description: "Modified module",
          },
        },
        {
          fileName: "added-contract.yml",
          filePath: "/contracts/added-contract.yml",
          fileHash: "newhash222",
          content: {
            id: "added-module",
            type: "service",
            category: "backend",
            description: "Added module",
          },
        },
      ]);

      // Mock Neo4j query to return 2 stored contracts: 1 modified, 1 removed
      mockSession.run.mockResolvedValue({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "moduleId") return "modified-module";
              if (field === "storedHash") return "oldhash111";
              return null;
            }),
          },
          {
            get: jest.fn((field: string) => {
              if (field === "moduleId") return "removed-module";
              if (field === "storedHash") return "oldhash333";
              return null;
            }),
          },
        ],
      });

      const result = await service.checkIfContractsModified();

      expect(result.hasChanges).toBe(true);
      expect(result.totalChanges).toBe(3);
      expect(result.modifiedCount).toBe(1);
      expect(result.addedCount).toBe(1);
      expect(result.removedCount).toBe(1);
      expect(result.changes).toHaveLength(3);

      const modified = result.changes.find((c) => c.status === "modified");
      const added = result.changes.find((c) => c.status === "added");
      const removed = result.changes.find((c) => c.status === "removed");

      expect(modified).toBeDefined();
      expect(modified?.moduleId).toBe("modified-module");
      expect(modified?.currentHash).toBe("newhash111");
      expect(modified?.storedHash).toBe("oldhash111");

      expect(added).toBeDefined();
      expect(added?.moduleId).toBe("added-module");
      expect(added?.storedHash).toBeNull();

      expect(removed).toBeDefined();
      expect(removed?.moduleId).toBe("removed-module");
      expect(removed?.currentHash).toBe("");

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should handle Neo4j errors and throw", async () => {
      jest.spyOn(configService, "get").mockReturnValue("/contracts/*.yml");
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);

      mockSession.run.mockRejectedValue(new Error("Neo4j connection failed"));

      await expect(service.checkIfContractsModified()).rejects.toThrow(
        "Failed to check contract modifications: Neo4j connection failed",
      );

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should close session even if error occurs", async () => {
      jest.spyOn(configService, "get").mockReturnValue("/contracts/*.yml");
      jest
        .spyOn(service, "getAllContracts")
        .mockRejectedValue(new Error("Failed to read contracts"));

      await expect(service.checkIfContractsModified()).rejects.toThrow();

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should handle empty Neo4j database (no stored contracts)", async () => {
      const currentHash = "hash123";

      jest.spyOn(configService, "get").mockReturnValue("/contracts/*.yml");

      jest.spyOn(service, "getAllContracts").mockResolvedValue([
        {
          fileName: "contract.yml",
          filePath: "/contracts/contract.yml",
          fileHash: currentHash,
          content: {
            id: "test-module",
            type: "service",
            category: "backend",
            description: "Test module",
          },
        },
      ]);

      mockSession.run.mockResolvedValue({
        records: [],
      });

      const result = await service.checkIfContractsModified();

      expect(result.hasChanges).toBe(true);
      expect(result.totalChanges).toBe(1);
      expect(result.addedCount).toBe(1);
      expect(result.changes[0].status).toBe("added");
    });

    it("should handle empty contracts directory (no current contracts)", async () => {
      jest.spyOn(configService, "get").mockReturnValue("/contracts/*.yml");
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);

      mockSession.run.mockResolvedValue({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "moduleId") return "old-module";
              if (field === "storedHash") return "oldhash";
              return null;
            }),
          },
        ],
      });

      const result = await service.checkIfContractsModified();

      expect(result.hasChanges).toBe(true);
      expect(result.totalChanges).toBe(1);
      expect(result.removedCount).toBe(1);
      expect(result.changes[0].status).toBe("removed");
    });

    it("should correctly identify contracts with matching hashes among multiple contracts", async () => {
      jest.spyOn(configService, "get").mockReturnValue("/contracts/*.yml");

      jest.spyOn(service, "getAllContracts").mockResolvedValue([
        {
          fileName: "contract1.yml",
          filePath: "/contracts/contract1.yml",
          fileHash: "hash1",
          content: {
            id: "module1",
            type: "service",
            category: "backend",
            description: "Module 1",
          },
        },
        {
          fileName: "contract2.yml",
          filePath: "/contracts/contract2.yml",
          fileHash: "hash2",
          content: {
            id: "module2",
            type: "service",
            category: "backend",
            description: "Module 2",
          },
        },
      ]);

      mockSession.run.mockResolvedValue({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "moduleId") return "module1";
              if (field === "storedHash") return "hash1";
              return null;
            }),
          },
          {
            get: jest.fn((field: string) => {
              if (field === "moduleId") return "module2";
              if (field === "storedHash") return "hash2";
              return null;
            }),
          },
        ],
      });

      const result = await service.checkIfContractsModified();

      expect(result.hasChanges).toBe(false);
      expect(result.totalChanges).toBe(0);
      expect(result.changes).toEqual([]);
    });
  });

  describe("getModuleRelations", () => {
    beforeEach(() => {
      mockSession.run.mockClear();
      mockSession.close.mockClear();
      jest.spyOn(neo4jService, "getSession").mockReturnValue(mockSession);
    });

    it("should return module relations with outgoing and incoming dependencies", async () => {
      // Mock module exists check
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: jest.fn() }],
      });

      // Mock outgoing dependencies query
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "module_id") return "auth-service";
              if (field === "parts")
                return JSON.stringify([
                  { part_id: "authenticate", type: "function" },
                  { part_id: "validateToken", type: "function" },
                ]);
              return null;
            }),
          },
        ],
      });

      // Mock incoming dependencies query
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "module_id") return "users-controller";
              if (field === "parts")
                return JSON.stringify([
                  { part_id: "findUser", type: "function" },
                  { part_id: "listUsers", type: "function" },
                ]);
              return null;
            }),
          },
        ],
      });

      const result = await service.getModuleRelations("users-service");

      expect(result).toBeDefined();
      expect(result.module_id).toBe("users-service");
      expect(result.outgoing_dependencies).toHaveLength(1);
      expect(result.incoming_dependencies).toHaveLength(1);

      // Verify outgoing dependency
      expect(result.outgoing_dependencies[0].module_id).toBe("auth-service");
      expect(result.outgoing_dependencies[0].parts).toHaveLength(2);
      expect(result.outgoing_dependencies[0].parts[0].part_id).toBe(
        "authenticate",
      );

      // Verify incoming dependency
      expect(result.incoming_dependencies[0].module_id).toBe(
        "users-controller",
      );
      expect(result.incoming_dependencies[0].parts).toHaveLength(2);
      expect(result.incoming_dependencies[0].parts[0].part_id).toBe("findUser");

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should return module relations with no dependencies", async () => {
      // Mock module exists check
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: jest.fn() }],
      });

      // Mock empty outgoing dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      // Mock empty incoming dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      const result = await service.getModuleRelations("standalone-module");

      expect(result).toBeDefined();
      expect(result.module_id).toBe("standalone-module");
      expect(result.outgoing_dependencies).toHaveLength(0);
      expect(result.incoming_dependencies).toHaveLength(0);

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should return module relations with only outgoing dependencies", async () => {
      // Mock module exists check
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: jest.fn() }],
      });

      // Mock outgoing dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "module_id") return "dep1";
              if (field === "parts")
                return JSON.stringify([{ part_id: "func1", type: "function" }]);
              return null;
            }),
          },
          {
            get: jest.fn((field: string) => {
              if (field === "module_id") return "dep2";
              if (field === "parts")
                return JSON.stringify([{ part_id: "func2", type: "function" }]);
              return null;
            }),
          },
        ],
      });

      // Mock empty incoming dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      const result = await service.getModuleRelations("users-controller");

      expect(result).toBeDefined();
      expect(result.module_id).toBe("users-controller");
      expect(result.outgoing_dependencies).toHaveLength(2);
      expect(result.incoming_dependencies).toHaveLength(0);

      expect(result.outgoing_dependencies[0].module_id).toBe("dep1");
      expect(result.outgoing_dependencies[1].module_id).toBe("dep2");

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should return module relations with only incoming dependencies", async () => {
      // Mock module exists check
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: jest.fn() }],
      });

      // Mock empty outgoing dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      // Mock incoming dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "module_id") return "users-service";
              if (field === "parts")
                return JSON.stringify([
                  { part_id: "authenticate", type: "function" },
                ]);
              return null;
            }),
          },
          {
            get: jest.fn((field: string) => {
              if (field === "module_id") return "orders-service";
              if (field === "parts")
                return JSON.stringify([
                  { part_id: "validateToken", type: "function" },
                ]);
              return null;
            }),
          },
        ],
      });

      const result = await service.getModuleRelations("auth-service");

      expect(result).toBeDefined();
      expect(result.module_id).toBe("auth-service");
      expect(result.outgoing_dependencies).toHaveLength(0);
      expect(result.incoming_dependencies).toHaveLength(2);

      expect(result.incoming_dependencies[0].module_id).toBe("users-service");
      expect(result.incoming_dependencies[1].module_id).toBe("orders-service");

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should throw error when module does not exist", async () => {
      // Mock module not found
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      await expect(
        service.getModuleRelations("non-existent-module"),
      ).rejects.toThrow('Module with id "non-existent-module" not found');

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should handle Neo4j errors during module check", async () => {
      mockSession.run.mockRejectedValueOnce(
        new Error("Neo4j connection failed"),
      );

      await expect(service.getModuleRelations("users-service")).rejects.toThrow(
        "Neo4j connection failed",
      );

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should handle Neo4j errors during outgoing dependencies query", async () => {
      // Mock module exists check
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: jest.fn() }],
      });

      // Mock error on outgoing dependencies query
      mockSession.run.mockRejectedValueOnce(new Error("Query failed"));

      await expect(service.getModuleRelations("users-service")).rejects.toThrow(
        "Query failed",
      );

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should handle Neo4j errors during incoming dependencies query", async () => {
      // Mock module exists check
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: jest.fn() }],
      });

      // Mock successful outgoing dependencies query
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      // Mock error on incoming dependencies query
      mockSession.run.mockRejectedValueOnce(new Error("Query failed"));

      await expect(service.getModuleRelations("users-service")).rejects.toThrow(
        "Query failed",
      );

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should close session even when error occurs", async () => {
      mockSession.run.mockRejectedValueOnce(
        new Error("Database connection error"),
      );

      await expect(service.getModuleRelations("users-service")).rejects.toThrow(
        "Database connection error",
      );

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should handle multiple parts in dependencies", async () => {
      // Mock module exists check
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: jest.fn() }],
      });

      // Mock outgoing dependencies with multiple parts
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "module_id") return "complex-dep";
              if (field === "parts")
                return JSON.stringify([
                  { part_id: "func1", type: "function" },
                  { part_id: "func2", type: "function" },
                  { part_id: "class1", type: "class" },
                  { part_id: "interface1", type: "interface" },
                ]);
              return null;
            }),
          },
        ],
      });

      // Mock incoming dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      const result = await service.getModuleRelations("test-module");

      expect(result.outgoing_dependencies[0].parts).toHaveLength(4);
      expect(result.outgoing_dependencies[0].parts[0].part_id).toBe("func1");
      expect(result.outgoing_dependencies[0].parts[1].part_id).toBe("func2");
      expect(result.outgoing_dependencies[0].parts[2].part_id).toBe("class1");
      expect(result.outgoing_dependencies[0].parts[3].part_id).toBe(
        "interface1",
      );

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should correctly parse parts JSON from Neo4j", async () => {
      // Mock module exists check
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: jest.fn() }],
      });

      // Mock outgoing dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "module_id") return "dep1";
              if (field === "parts")
                return JSON.stringify([
                  { part_id: "testFunc", type: "function" },
                ]);
              return null;
            }),
          },
        ],
      });

      // Mock incoming dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "module_id") return "dependent1";
              if (field === "parts")
                return JSON.stringify([
                  { part_id: "exportFunc", type: "function" },
                ]);
              return null;
            }),
          },
        ],
      });

      const result = await service.getModuleRelations("test-module");

      // Verify outgoing parts structure
      expect(result.outgoing_dependencies[0].parts[0]).toHaveProperty(
        "part_id",
      );
      expect(result.outgoing_dependencies[0].parts[0]).toHaveProperty("type");
      expect(result.outgoing_dependencies[0].parts[0].part_id).toBe("testFunc");
      expect(result.outgoing_dependencies[0].parts[0].type).toBe("function");

      // Verify incoming parts structure
      expect(result.incoming_dependencies[0].parts[0]).toHaveProperty(
        "part_id",
      );
      expect(result.incoming_dependencies[0].parts[0]).toHaveProperty("type");
      expect(result.incoming_dependencies[0].parts[0].part_id).toBe(
        "exportFunc",
      );
      expect(result.incoming_dependencies[0].parts[0].type).toBe("function");

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should handle dependencies with no parts (empty array)", async () => {
      // Mock module exists check
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: jest.fn() }],
      });

      // Mock outgoing dependencies with empty parts
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((field: string) => {
              if (field === "module_id") return "dep1";
              if (field === "parts") return JSON.stringify([]);
              return null;
            }),
          },
        ],
      });

      // Mock incoming dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      const result = await service.getModuleRelations("test-module");

      expect(result.outgoing_dependencies[0].parts).toHaveLength(0);

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should verify module_id is passed correctly to Neo4j queries", async () => {
      const testModuleId = "specific-module-id";

      // Mock module exists check
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: jest.fn() }],
      });

      // Mock outgoing dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      // Mock incoming dependencies
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      await service.getModuleRelations(testModuleId);

      // Verify module check query
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MATCH (m:Module {module_id: $moduleId})"),
        expect.objectContaining({ moduleId: testModuleId }),
      );

      // Verify outgoing dependencies query
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining(
          "MATCH (m:Module {module_id: $moduleId})-[r:MODULE_DEPENDENCY]->(dep:Module)",
        ),
        expect.objectContaining({ moduleId: testModuleId }),
      );

      // Verify incoming dependencies query
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining(
          "MATCH (dependent:Module)-[r:MODULE_DEPENDENCY]->(m:Module {module_id: $moduleId})",
        ),
        expect.objectContaining({ moduleId: testModuleId }),
      );

      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe("searchByDescription", () => {
    beforeEach(() => {
      // Mock embedding service to be ready by default for these tests
      jest.spyOn(embeddingService, "isReady").mockReturnValue(true);
    });

    it("should search modules by description and return results", async () => {
      const query = "user authentication service";
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockResults = [
        {
          get: (field: string) => {
            const data = {
              module_id: "auth-service",
              similarity: 0.92,
            };
            return data[field];
          },
        },
        {
          get: (field: string) => {
            const data = {
              module_id: "users-service",
              similarity: 0.78,
            };
            return data[field];
          },
        },
      ];

      const mockContracts = [
        {
          fileName: "auth-service.yml",
          filePath: "/contracts/auth-service.yml",
          fileHash: "hash1",
          content: {
            id: "auth-service",
            type: "service",
            description: "Authentication service for users",
            category: "backend",
          },
        },
        {
          fileName: "users-service.yml",
          filePath: "/contracts/users-service.yml",
          fileHash: "hash2",
          content: {
            id: "users-service",
            type: "service",
            description: "User management service",
            category: "backend",
          },
        },
      ];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);
      mockSession.run.mockResolvedValue({ records: mockResults });

      const result = await service.searchByDescription(query, 10);

      expect(result).toBeDefined();
      expect(result.query).toBe(query);
      expect(result.resultsCount).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].content.id).toBe("auth-service");
      expect(result.results[0].similarity).toBe(0.92);
      expect(result.results[1].content.id).toBe("users-service");
      expect(result.results[1].similarity).toBe(0.78);

      // Verify embedding was generated for the query
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(query);

      // Verify Neo4j query was executed with correct parameters
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MATCH (m:Module)"),
        expect.objectContaining({
          queryEmbedding: mockEmbedding,
          limit: neo4jInt(10),
        }),
      );

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should use custom limit parameter", async () => {
      const query = "test query";
      const customLimit = 5;
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      await service.searchByDescription(query, customLimit);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: neo4jInt(customLimit),
        }),
      );
    });

    it("should return empty results when no matching modules found", async () => {
      const query = "nonexistent module";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      const result = await service.searchByDescription(query, 10);

      expect(result.query).toBe(query);
      expect(result.resultsCount).toBe(0);
      expect(result.results).toEqual([]);
    });

    it("should filter by type only without query (no semantic search)", async () => {
      const mockResults = [
        {
          get: (field: string) => {
            const data = {
              module_id: "auth-service",
            };
            return data[field];
          },
        },
        {
          get: (field: string) => {
            const data = {
              module_id: "users-service",
            };
            return data[field];
          },
        },
      ];

      const mockContracts = [
        {
          fileName: "auth-service.yml",
          filePath: "/contracts/auth-service.yml",
          fileHash: "hash1",
          content: {
            id: "auth-service",
            type: "service",
            description: "Authentication service",
            category: "backend",
          },
        },
        {
          fileName: "users-service.yml",
          filePath: "/contracts/users-service.yml",
          fileHash: "hash2",
          content: {
            id: "users-service",
            type: "service",
            description: "User management service",
            category: "backend",
          },
        },
      ];

      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);
      mockSession.run.mockResolvedValue({ records: mockResults });

      const result = await service.searchByDescription(
        undefined,
        10,
        "service",
        undefined,
      );

      expect(result).toBeDefined();
      expect(result.query).toBe("");
      expect(result.resultsCount).toBe(2);
      expect(result.results).toHaveLength(2);

      // Verify embedding service was NOT used
      expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();

      // Verify Neo4j query uses simple filter without similarity
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("WHERE m.type = $type"),
        expect.objectContaining({
          type: "service",
          limit: neo4jInt(10),
        }),
      );

      // Verify query does NOT contain embedding/similarity logic
      const queryString = mockSession.run.mock.calls[0][0];
      expect(queryString).not.toContain("embedding");
      expect(queryString).not.toContain("similarity");
      expect(queryString).toContain("ORDER BY m.module_id ASC");
    });

    it("should filter by category only without query (no semantic search)", async () => {
      const mockResults = [
        {
          get: (field: string) => {
            const data = {
              module_id: "auth-service",
            };
            return data[field];
          },
        },
      ];

      const mockContracts = [
        {
          fileName: "auth-service.yml",
          filePath: "/contracts/auth-service.yml",
          fileHash: "hash1",
          content: {
            id: "auth-service",
            type: "service",
            description: "Authentication service",
            category: "backend",
          },
        },
      ];

      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);
      mockSession.run.mockResolvedValue({ records: mockResults });

      const result = await service.searchByDescription(
        undefined,
        10,
        undefined,
        "backend",
      );

      expect(result).toBeDefined();
      expect(result.query).toBe("");
      expect(result.resultsCount).toBe(1);

      // Verify embedding service was NOT used
      expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();

      // Verify Neo4j query uses simple filter
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("WHERE m.category = $category"),
        expect.objectContaining({
          category: "backend",
          limit: neo4jInt(10),
        }),
      );
    });

    it("should filter by type and category without query (no semantic search)", async () => {
      const mockResults = [
        {
          get: (field: string) => {
            const data = {
              module_id: "auth-service",
            };
            return data[field];
          },
        },
      ];

      const mockContracts = [
        {
          fileName: "auth-service.yml",
          filePath: "/contracts/auth-service.yml",
          fileHash: "hash1",
          content: {
            id: "auth-service",
            type: "service",
            description: "Authentication service",
            category: "backend",
          },
        },
      ];

      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);
      mockSession.run.mockResolvedValue({ records: mockResults });

      const result = await service.searchByDescription(
        undefined,
        10,
        "service",
        "backend",
      );

      expect(result).toBeDefined();
      expect(result.query).toBe("");
      expect(result.resultsCount).toBe(1);

      // Verify embedding service was NOT used
      expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();

      // Verify Neo4j query uses both filters
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("WHERE m.type = $type AND m.category = $category"),
        expect.objectContaining({
          type: "service",
          category: "backend",
          limit: neo4jInt(10),
        }),
      );
    });

    it("should set similarity to 1.0 for filter-only results (no query)", async () => {
      const mockResults = [
        {
          get: (field: string) => {
            const data = {
              module_id: "auth-service",
            };
            return data[field];
          },
        },
      ];

      const mockContracts = [
        {
          fileName: "auth-service.yml",
          filePath: "/contracts/auth-service.yml",
          fileHash: "hash1",
          content: {
            id: "auth-service",
            type: "service",
            description: "Authentication service",
            category: "backend",
          },
        },
      ];

      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);
      mockSession.run.mockResolvedValue({ records: mockResults });

      const result = await service.searchByDescription(
        undefined,
        10,
        "service",
      );

      expect(result.results[0].similarity).toBe(1.0);
    });

    it("should throw error when embedding service is not ready", async () => {
      jest.spyOn(embeddingService, "isReady").mockReturnValue(false);

      await expect(
        service.searchByDescription("test query", 10),
      ).rejects.toThrow("Embedding service is not ready");

      expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
      expect(mockSession.run).not.toHaveBeenCalled();
    });

    it("should handle embedding generation errors", async () => {
      const query = "test query";
      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockRejectedValue(new Error("Embedding model error"));

      await expect(service.searchByDescription(query, 10)).rejects.toThrow(
        "Failed to search modules",
      );

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(query);
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should handle Neo4j query errors", async () => {
      const query = "test query";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      mockSession.run.mockRejectedValue(new Error("Neo4j connection error"));

      await expect(service.searchByDescription(query, 10)).rejects.toThrow(
        "Failed to search modules",
      );

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should search using cosine similarity (dot product for normalized vectors)", async () => {
      const query = "test";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      await service.searchByDescription(query, 10);

      // Verify the query uses dot product calculation
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("reduce(dot = 0.0"),
        expect.any(Object),
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("m.embedding[i] * $queryEmbedding[i]"),
        expect.any(Object),
      );
    });

    it("should filter out modules without embeddings", async () => {
      const query = "test";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      await service.searchByDescription(query, 10);

      // Verify the query filters for non-null embeddings
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("WHERE m.embedding IS NOT NULL"),
        expect.any(Object),
      );
    });

    it("should filter out results with similarity <= 0", async () => {
      const query = "test";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      await service.searchByDescription(query, 10);

      // Verify the query filters for positive similarity
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("WHERE similarity > 0"),
        expect.any(Object),
      );
    });

    it("should order results by similarity descending", async () => {
      const query = "test";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      await service.searchByDescription(query, 10);

      // Verify the query orders by similarity descending
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY similarity DESC"),
        expect.any(Object),
      );
    });

    it("should return all required fields for each result", async () => {
      const query = "test";
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResults = [
        {
          get: (field: string) => {
            const data = {
              module_id: "test-module",
              type: "service",
              description: "Test module description",
              category: "backend",
              similarity: 0.95,
            };
            return data[field];
          },
        },
      ];

      const mockContracts = [
        {
          fileName: "test-module.yml",
          filePath: "/contracts/test-module.yml",
          fileHash: "hash1",
          content: {
            id: "test-module",
            type: "service",
            description: "Test module description",
            category: "backend",
          },
        },
      ];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);
      mockSession.run.mockResolvedValue({ records: mockResults });

      const result = await service.searchByDescription(query, 10);

      expect(result.results[0]).toHaveProperty("fileName");
      expect(result.results[0]).toHaveProperty("filePath");
      expect(result.results[0]).toHaveProperty("content");
      expect(result.results[0]).toHaveProperty("fileHash");
      expect(result.results[0]).toHaveProperty("similarity");
      expect(result.results[0].content).toHaveProperty("id");
      expect(result.results[0].content).toHaveProperty("type");
      expect(result.results[0].content).toHaveProperty("description");
      expect(result.results[0].content).toHaveProperty("category");
    });

    it("should handle queries with special characters", async () => {
      const query = "user's auth & security";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      const result = await service.searchByDescription(query, 10);

      expect(result.query).toBe(query);
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(query);
    });

    it("should handle long queries", async () => {
      const longQuery =
        "This is a very long query describing a complex authentication and authorization service that handles user login, session management, token validation, and security features";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      const result = await service.searchByDescription(longQuery, 10);

      expect(result.query).toBe(longQuery);
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(
        longQuery,
      );
    });

    it("should handle multiple search results correctly", async () => {
      const query = "service";
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResults = Array(5)
        .fill(null)
        .map((_, i) => ({
          get: (field: string) => {
            const data = {
              module_id: `service-${i}`,
              similarity: 0.9 - i * 0.1,
            };
            return data[field];
          },
        }));

      const mockContracts = Array(5)
        .fill(null)
        .map((_, i) => ({
          fileName: `service-${i}.yml`,
          filePath: `/contracts/service-${i}.yml`,
          fileHash: `hash${i}`,
          content: {
            id: `service-${i}`,
            type: "service",
            description: `Service ${i}`,
            category: "backend",
          },
        }));

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);
      mockSession.run.mockResolvedValue({ records: mockResults });

      const result = await service.searchByDescription(query, 10);

      expect(result.resultsCount).toBe(5);
      expect(result.results).toHaveLength(5);
      // Verify all modules are correctly mapped
      result.results.forEach((res, i) => {
        expect(res.content.id).toBe(`service-${i}`);
        expect(res.similarity).toBe(0.9 - i * 0.1);
      });
    });

    it("should always close session even on error", async () => {
      const query = "test";
      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockRejectedValue(new Error("Test error"));

      await expect(service.searchByDescription(query, 10)).rejects.toThrow();

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should filter by type when type parameter is provided", async () => {
      const query = "authentication";
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResults = [
        {
          get: (field: string) => {
            const data = {
              module_id: "auth-service",
              similarity: 0.92,
            };
            return data[field];
          },
        },
      ];

      const mockContracts = [
        {
          fileName: "auth-service.yml",
          filePath: "/contracts/auth-service.yml",
          fileHash: "hash1",
          content: {
            id: "auth-service",
            type: "service",
            description: "Authentication service",
            category: "backend",
          },
        },
      ];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);
      mockSession.run.mockResolvedValue({ records: mockResults });

      const result = await service.searchByDescription(query, 10, "service");

      expect(result).toBeDefined();
      expect(result.resultsCount).toBe(1);
      expect(result.results[0].content.type).toBe("service");

      // Verify Neo4j query includes type filter
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("m.type = $type"),
        expect.objectContaining({
          queryEmbedding: mockEmbedding,
          limit: neo4jInt(10),
          type: "service",
        }),
      );
    });

    it("should filter by category when category parameter is provided", async () => {
      const query = "authentication";
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResults = [
        {
          get: (field: string) => {
            const data = {
              module_id: "auth-service",
              similarity: 0.92,
            };
            return data[field];
          },
        },
      ];

      const mockContracts = [
        {
          fileName: "auth-service.yml",
          filePath: "/contracts/auth-service.yml",
          fileHash: "hash1",
          content: {
            id: "auth-service",
            type: "service",
            description: "Authentication service",
            category: "backend",
          },
        },
      ];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);
      mockSession.run.mockResolvedValue({ records: mockResults });

      const result = await service.searchByDescription(
        query,
        10,
        undefined,
        "backend",
      );

      expect(result).toBeDefined();
      expect(result.resultsCount).toBe(1);
      expect(result.results[0].content.category).toBe("backend");

      // Verify Neo4j query includes category filter
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("m.category = $category"),
        expect.objectContaining({
          queryEmbedding: mockEmbedding,
          limit: neo4jInt(10),
          category: "backend",
        }),
      );
    });

    it("should filter by both type and category when both parameters are provided", async () => {
      const query = "authentication";
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockResults = [
        {
          get: (field: string) => {
            const data = {
              module_id: "auth-service",
              similarity: 0.92,
            };
            return data[field];
          },
        },
      ];

      const mockContracts = [
        {
          fileName: "auth-service.yml",
          filePath: "/contracts/auth-service.yml",
          fileHash: "hash1",
          content: {
            id: "auth-service",
            type: "service",
            description: "Authentication service",
            category: "backend",
          },
        },
      ];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);
      mockSession.run.mockResolvedValue({ records: mockResults });

      const result = await service.searchByDescription(
        query,
        10,
        "service",
        "backend",
      );

      expect(result).toBeDefined();
      expect(result.resultsCount).toBe(1);
      expect(result.results[0].content.type).toBe("service");
      expect(result.results[0].content.category).toBe("backend");

      // Verify Neo4j query includes both filters
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("m.type = $type"),
        expect.objectContaining({
          queryEmbedding: mockEmbedding,
          limit: neo4jInt(10),
          type: "service",
          category: "backend",
        }),
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("m.category = $category"),
        expect.any(Object),
      );
    });

    it("should return empty results when filters match no modules", async () => {
      const query = "authentication";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      const result = await service.searchByDescription(
        query,
        10,
        "nonexistent-type",
        "nonexistent-category",
      );

      expect(result.resultsCount).toBe(0);
      expect(result.results).toEqual([]);
    });

    it("should not add type filter to query when type is undefined", async () => {
      const query = "test";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      await service.searchByDescription(query, 10, undefined, undefined);

      // Verify the query doesn't contain type filter
      const queryString = mockSession.run.mock.calls[0][0];
      expect(queryString).not.toContain("m.type = $type");

      // Verify parameters don't contain type
      const params = mockSession.run.mock.calls[0][1];
      expect(params).not.toHaveProperty("type");
    });

    it("should not add category filter to query when category is undefined", async () => {
      const query = "test";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      await service.searchByDescription(query, 10, undefined, undefined);

      // Verify the query doesn't contain category filter
      const queryString = mockSession.run.mock.calls[0][0];
      expect(queryString).not.toContain("m.category = $category");

      // Verify parameters don't contain category
      const params = mockSession.run.mock.calls[0][1];
      expect(params).not.toHaveProperty("category");
    });

    it("should combine filters with AND logic", async () => {
      const query = "test";
      const mockEmbedding = [0.1, 0.2, 0.3];

      jest
        .spyOn(embeddingService, "generateEmbedding")
        .mockResolvedValue(mockEmbedding);
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);
      mockSession.run.mockResolvedValue({ records: [] });

      await service.searchByDescription(query, 10, "service", "backend");

      // Verify the query uses AND to combine filters
      const queryString = mockSession.run.mock.calls[0][0];
      expect(queryString).toContain("m.embedding IS NOT NULL");
      expect(queryString).toContain(" AND ");
      expect(queryString).toContain("m.type = $type");
      expect(queryString).toContain("m.category = $category");
    });
  });

  describe("getCategoriesList", () => {
    it("should return list of unique categories", async () => {
      const mockRecords = [
        { get: () => "api" },
        { get: () => "service" },
        { get: () => "frontend" },
      ];
      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await service.getCategoriesList();

      expect(result).toHaveProperty("categories");
      expect(result.categories).toHaveLength(3);
      expect(result.categories).toEqual(["api", "service", "frontend"]);
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MATCH (m:Module)"),
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("WHERE m.category IS NOT NULL"),
      );
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("RETURN DISTINCT m.category AS category"),
      );
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should return empty array when no categories exist", async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      const result = await service.getCategoriesList();

      expect(result.categories).toEqual([]);
      expect(result.categories).toHaveLength(0);
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should return categories in alphabetical order", async () => {
      const mockRecords = [
        { get: () => "api" },
        { get: () => "backend" },
        { get: () => "frontend" },
        { get: () => "service" },
      ];
      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await service.getCategoriesList();

      expect(result.categories).toEqual([
        "api",
        "backend",
        "frontend",
        "service",
      ]);
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY category ASC"),
      );
    });

    it("should handle single category", async () => {
      const mockRecords = [{ get: () => "api" }];
      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await service.getCategoriesList();

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0]).toBe("api");
    });

    it("should throw error when Neo4j query fails", async () => {
      mockSession.run.mockRejectedValue(new Error("Neo4j connection failed"));

      await expect(service.getCategoriesList()).rejects.toThrow(
        "Failed to fetch categories: Neo4j connection failed",
      );
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should always close session even on error", async () => {
      mockSession.run.mockRejectedValue(new Error("Test error"));

      await expect(service.getCategoriesList()).rejects.toThrow();

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should filter out null categories using WHERE clause", async () => {
      const mockRecords = [{ get: () => "api" }, { get: () => "service" }];
      mockSession.run.mockResolvedValue({ records: mockRecords });

      await service.getCategoriesList();

      const callArg = mockSession.run.mock.calls[0][0];
      expect(callArg).toContain("WHERE m.category IS NOT NULL");
    });

    it("should return only distinct categories", async () => {
      // The query uses DISTINCT, so Neo4j should only return unique values
      const mockRecords = [
        { get: () => "api" },
        { get: () => "service" },
        { get: () => "frontend" },
      ];
      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await service.getCategoriesList();

      // Verify all categories are unique
      const uniqueCategories = [...new Set(result.categories)];
      expect(result.categories).toEqual(uniqueCategories);

      const callArg = mockSession.run.mock.calls[0][0];
      expect(callArg).toContain("DISTINCT");
    });

    it("should handle database timeout error", async () => {
      mockSession.run.mockRejectedValue(new Error("Database timeout"));

      await expect(service.getCategoriesList()).rejects.toThrow(
        "Failed to fetch categories: Database timeout",
      );
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should log fetching operation", async () => {
      const loggerSpy = jest.spyOn(service["logger"], "log");
      const mockRecords = [{ get: () => "api" }];
      mockSession.run.mockResolvedValue({ records: mockRecords });

      await service.getCategoriesList();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Fetching all unique contract categories from Neo4j",
      );
      expect(loggerSpy).toHaveBeenCalledWith("Found 1 unique categories");
    });

    it("should log error when query fails", async () => {
      const loggerSpy = jest.spyOn(service["logger"], "error");
      const errorMessage = "Connection error";
      mockSession.run.mockRejectedValue(new Error(errorMessage));

      await expect(service.getCategoriesList()).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Error fetching categories:",
        errorMessage,
      );
    });

    it("should return categories with correct DTO structure", async () => {
      const mockRecords = [{ get: () => "api" }, { get: () => "service" }];
      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await service.getCategoriesList();

      expect(result).toHaveProperty("categories");
      expect(Array.isArray(result.categories)).toBe(true);
      result.categories.forEach((category) => {
        expect(typeof category).toBe("string");
      });
    });
  });
});
