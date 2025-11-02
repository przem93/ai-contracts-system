import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ContractsService } from "./contracts.service";
import { Neo4jService } from "../neo4j/neo4j.service";
import { Contract } from "./contract.schema";
import * as path from "path";

describe("ContractsService", () => {
  let service: ContractsService;
  let configService: ConfigService;
  let neo4jService: Neo4jService;
  let mockSession: any;

  beforeEach(async () => {
    // Create mock session
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
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
      const contracts: Contract[] = [
        {
          id: "test-module",
          type: "service",
          category: "backend",
          description: "Test module",
        },
      ];

      await service.applyContractsToNeo4j(contracts);

      // Verify database clearing is the FIRST operation
      expect(mockSession.run.mock.calls[0][0]).toBe(
        "MATCH (n) DETACH DELETE n",
      );

      // Verify module creation happens AFTER clearing
      expect(mockSession.run.mock.calls[1][0]).toContain(
        "MERGE (m:Module {module_id: $module_id})",
      );
    });

    it("should successfully apply a contract with module, parts, and dependencies", async () => {
      const contracts: Contract[] = [
        {
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
      ];

      const result = await service.applyContractsToNeo4j(contracts);

      expect(result.success).toBe(true);
      expect(result.modulesProcessed).toBe(1);
      expect(result.partsProcessed).toBe(2);
      expect(result.message).toContain("Successfully applied");

      // Verify database was cleared first
      expect(mockSession.run).toHaveBeenCalledWith("MATCH (n) DETACH DELETE n");

      // Verify module creation was called
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m:Module {module_id: $module_id})"),
        expect.objectContaining({
          module_id: "users-get",
          type: "controller",
          category: "api",
          description: "Users get endpoint",
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

      // Verify MODULE_DEPENDENCY relationship was called
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (m)-[r:MODULE_DEPENDENCY"),
        expect.objectContaining({
          from_module_id: "users-get",
          to_module_id: "users-service",
          parts: expect.any(String),
        }),
      );

      // Verify session was closed
      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should successfully apply a contract without parts", async () => {
      const contracts: Contract[] = [
        {
          id: "simple-module",
          type: "service",
          category: "backend",
          description: "Simple service module",
        },
      ];

      const result = await service.applyContractsToNeo4j(contracts);

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
      const contracts: Contract[] = [
        {
          id: "standalone-module",
          type: "service",
          category: "backend",
          description: "Standalone module with no dependencies",
          parts: [{ id: "part1", type: "function" }],
        },
      ];

      const result = await service.applyContractsToNeo4j(contracts);

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
      const contracts: Contract[] = [
        {
          id: "module-1",
          type: "controller",
          category: "api",
          description: "First module",
          parts: [{ id: "part1", type: "function" }],
        },
        {
          id: "module-2",
          type: "service",
          category: "backend",
          description: "Second module",
          parts: [
            { id: "part1", type: "class" },
            { id: "part2", type: "interface" },
          ],
        },
        {
          id: "module-3",
          type: "component",
          category: "frontend",
          description: "Third module",
        },
      ];

      const result = await service.applyContractsToNeo4j(contracts);

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
      const contracts: Contract[] = [];

      const result = await service.applyContractsToNeo4j(contracts);

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

      const contracts: Contract[] = [
        {
          id: "test-module",
          type: "service",
          category: "backend",
          description: "Test module",
        },
      ];

      const result = await service.applyContractsToNeo4j(contracts);

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
      const contracts: Contract[] = [
        {
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
      ];

      await service.applyContractsToNeo4j(contracts);

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

      const contracts: Contract[] = [
        {
          id: "test-module",
          type: "service",
          category: "backend",
          description: "Test module",
        },
      ];

      await service.applyContractsToNeo4j(contracts);

      expect(mockSession.close).toHaveBeenCalled();
    });

    it("should process all parts for a module with multiple parts", async () => {
      const contracts: Contract[] = [
        {
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
      ];

      const result = await service.applyContractsToNeo4j(contracts);

      expect(result.success).toBe(true);
      expect(result.partsProcessed).toBe(4);

      // Verify all parts were created
      const partCreationCalls = mockSession.run.mock.calls.filter((call) =>
        call[0].includes("MERGE (p:Part"),
      );
      expect(partCreationCalls.length).toBe(4);
    });

    it("should process all dependencies for a module with multiple dependencies", async () => {
      const contracts: Contract[] = [
        {
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
      ];

      const result = await service.applyContractsToNeo4j(contracts);

      expect(result.success).toBe(true);

      // Verify all dependencies were created
      const dependencyCalls = mockSession.run.mock.calls.filter((call) =>
        call[0].includes("MODULE_DEPENDENCY"),
      );
      expect(dependencyCalls.length).toBe(3);
    });
  });
});
