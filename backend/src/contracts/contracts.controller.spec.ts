// Mock @xenova/transformers module
jest.mock("@xenova/transformers", () => ({
  pipeline: jest.fn(),
  env: {
    allowLocalModels: false,
  },
}));

import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";

describe("ContractsController", () => {
  let controller: ContractsController;
  let service: ContractsService;

  const mockValidationResult = {
    valid: true,
    files: [
      {
        filePath: "/path/to/contract1.yml",
        fileName: "contract1.yml",
        valid: true,
      },
      {
        filePath: "/path/to/contract2.yml",
        fileName: "contract2.yml",
        valid: true,
      },
    ],
  };

  const mockInvalidValidationResult = {
    valid: false,
    files: [
      {
        filePath: "/path/to/valid-contract.yml",
        fileName: "valid-contract.yml",
        valid: true,
      },
      {
        filePath: "/path/to/invalid-contract.yml",
        fileName: "invalid-contract.yml",
        valid: false,
        errors: [
          {
            path: "id",
            message: "Contract id is required",
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [
        {
          provide: ContractsService,
          useValue: {
            getAllContracts: jest.fn(),
            validateContracts: jest.fn(),
            applyContractsToNeo4j: jest.fn(),
            checkIfContractsModified: jest.fn(),
            getModuleRelations: jest.fn(),
            searchByDescription: jest.fn(),
            getContractTypes: jest.fn(),
            getCategoriesList: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContractsController>(ContractsController);
    service = module.get<ContractsService>(ContractsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("validateContracts", () => {
    it("should return validation results for all contracts", async () => {
      jest
        .spyOn(service, "validateContracts")
        .mockResolvedValue(mockValidationResult);

      const result = await controller.validateContracts();

      expect(result).toEqual(mockValidationResult);
      expect(service.validateContracts).toHaveBeenCalled();
    });

    it("should return valid: true when all contracts are valid", async () => {
      jest
        .spyOn(service, "validateContracts")
        .mockResolvedValue(mockValidationResult);

      const result = await controller.validateContracts();

      expect(result.valid).toBe(true);
      expect(result.files.every((file) => file.valid)).toBe(true);
    });

    it("should return valid: false when any contract is invalid", async () => {
      jest
        .spyOn(service, "validateContracts")
        .mockResolvedValue(mockInvalidValidationResult);

      const result = await controller.validateContracts();

      expect(result.valid).toBe(false);
      expect(result.files.some((file) => !file.valid)).toBe(true);
    });

    it("should include error details for invalid contracts", async () => {
      jest
        .spyOn(service, "validateContracts")
        .mockResolvedValue(mockInvalidValidationResult);

      const result = await controller.validateContracts();

      const invalidFile = result.files.find((file) => !file.valid);
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.errors).toBeDefined();
      expect(invalidFile!.errors!.length).toBeGreaterThan(0);
      expect(invalidFile!.errors![0]).toHaveProperty("path");
      expect(invalidFile!.errors![0]).toHaveProperty("message");
    });

    it("should include file paths and names in validation results", async () => {
      jest
        .spyOn(service, "validateContracts")
        .mockResolvedValue(mockValidationResult);

      const result = await controller.validateContracts();

      expect(result.files.length).toBeGreaterThan(0);
      result.files.forEach((file) => {
        expect(file.filePath).toBeDefined();
        expect(file.fileName).toBeDefined();
        expect(file.valid).toBeDefined();
      });
    });

    it("should handle empty contract list", async () => {
      jest.spyOn(service, "validateContracts").mockResolvedValue({
        valid: true,
        files: [],
      });

      const result = await controller.validateContracts();

      expect(result.valid).toBe(true);
      expect(result.files).toEqual([]);
    });

    it("should propagate errors from the service", async () => {
      jest
        .spyOn(service, "validateContracts")
        .mockRejectedValue(new Error("Service error"));

      await expect(controller.validateContracts()).rejects.toThrow(
        "Service error",
      );
    });

    it("should return validation errors for dependency part type mismatches", async () => {
      const mockTypeMismatchResult = {
        valid: false,
        files: [
          {
            filePath: "/path/to/valid-module.yml",
            fileName: "valid-module.yml",
            valid: true,
          },
          {
            filePath: "/path/to/invalid-type-mismatch.yml",
            fileName: "invalid-type-mismatch.yml",
            valid: false,
            errors: [
              {
                path: "dependencies.0.parts.0.type",
                message:
                  'Part type mismatch: expected "string" but got "function"',
              },
            ],
          },
        ],
      };

      jest
        .spyOn(service, "validateContracts")
        .mockResolvedValue(mockTypeMismatchResult);

      const result = await controller.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find((f) => !f.valid);
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.errors).toBeDefined();
      expect(invalidFile!.errors!.length).toBeGreaterThan(0);

      const typeMismatchError = invalidFile!.errors!.find((err) =>
        err.message.includes("Part type mismatch"),
      );
      expect(typeMismatchError).toBeDefined();
      expect(typeMismatchError!.path).toContain("dependencies");
      expect(typeMismatchError!.path).toContain("type");
      expect(typeMismatchError!.message).toContain("expected");
    });

    it("should return validation errors for multiple dependency part type mismatches", async () => {
      const mockMultipleTypeMismatchResult = {
        valid: false,
        files: [
          {
            filePath: "/path/to/valid-module.yml",
            fileName: "valid-module.yml",
            valid: true,
          },
          {
            filePath: "/path/to/invalid-multiple-mismatches.yml",
            fileName: "invalid-multiple-mismatches.yml",
            valid: false,
            errors: [
              {
                path: "dependencies.0.parts.0.type",
                message:
                  'Part type mismatch: expected "string" but got "function"',
              },
              {
                path: "dependencies.0.parts.1.type",
                message:
                  'Part type mismatch: expected "string" but got "number"',
              },
              {
                path: "dependencies.0.parts.2.type",
                message:
                  'Part type mismatch: expected "function" but got "string"',
              },
            ],
          },
        ],
      };

      jest
        .spyOn(service, "validateContracts")
        .mockResolvedValue(mockMultipleTypeMismatchResult);

      const result = await controller.validateContracts();

      expect(result.valid).toBe(false);
      const invalidFile = result.files.find((f) => !f.valid);
      expect(invalidFile).toBeDefined();
      expect(invalidFile!.errors).toBeDefined();

      const typeMismatchErrors = invalidFile!.errors!.filter((err) =>
        err.message.includes("Part type mismatch"),
      );
      expect(typeMismatchErrors.length).toBe(3);
      typeMismatchErrors.forEach((err) => {
        expect(err.path).toContain("dependencies");
        expect(err.path).toContain("type");
        expect(err.message).toContain("expected");
      });
    });
  });

  describe("getAllContracts", () => {
    it("should return all contracts from service", async () => {
      const mockContracts = [
        {
          fileName: "contract1.yml",
          filePath: "/path/to/contract1.yml",
          fileHash: "abc123",
          content: {
            id: "test",
            type: "service",
            category: "api",
            description: "Test service",
          },
        },
      ];

      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);

      const result = await controller.getAllContracts();

      expect(result).toEqual(mockContracts);
      expect(service.getAllContracts).toHaveBeenCalled();
    });
  });

  describe("applyContracts", () => {
    const mockContracts = [
      {
        fileName: "contract1.yml",
        filePath: "/path/to/contract1.yml",
        fileHash: "hash123",
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
      {
        fileName: "contract2.yml",
        filePath: "/path/to/contract2.yml",
        fileHash: "hash456",
        content: {
          id: "users-service",
          type: "service",
          category: "backend",
          description: "Users service",
          parts: [
            { id: "findUser", type: "function" },
            { id: "listUsers", type: "function" },
          ],
        },
      },
    ];

    const mockApplySuccessResult = {
      success: true,
      modulesProcessed: 2,
      partsProcessed: 4,
      message: "Successfully applied 2 modules and 4 parts to Neo4j",
    };

    it("should successfully apply contracts when validation passes", async () => {
      // Mock validation success
      jest.spyOn(service, "validateContracts").mockResolvedValue({
        valid: true,
        files: [
          {
            filePath: "/path/to/contract1.yml",
            fileName: "contract1.yml",
            valid: true,
          },
          {
            filePath: "/path/to/contract2.yml",
            fileName: "contract2.yml",
            valid: true,
          },
        ],
      });

      // Mock getAllContracts
      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);

      // Mock applyContractsToNeo4j success
      jest
        .spyOn(service, "applyContractsToNeo4j")
        .mockResolvedValue(mockApplySuccessResult);

      const result = await controller.applyContracts();

      // Verify the result
      expect(result).toEqual(mockApplySuccessResult);
      expect(result.success).toBe(true);
      expect(result.modulesProcessed).toBe(2);
      expect(result.partsProcessed).toBe(4);

      // Verify the methods were called in the correct order
      expect(service.validateContracts).toHaveBeenCalled();
      expect(service.getAllContracts).toHaveBeenCalled();
      expect(service.applyContractsToNeo4j).toHaveBeenCalledWith(mockContracts);
    });

    it("should throw BadRequestException when validation fails", async () => {
      // Mock validation failure
      const mockInvalidResult = {
        valid: false,
        files: [
          {
            filePath: "/path/to/valid-contract.yml",
            fileName: "valid-contract.yml",
            valid: true,
          },
          {
            filePath: "/path/to/invalid-contract.yml",
            fileName: "invalid-contract.yml",
            valid: false,
            errors: [
              {
                path: "id",
                message: "Contract id is required",
              },
            ],
          },
        ],
      };

      jest
        .spyOn(service, "validateContracts")
        .mockResolvedValue(mockInvalidResult);

      await expect(controller.applyContracts()).rejects.toThrow(
        BadRequestException,
      );

      // Verify validation was called
      expect(service.validateContracts).toHaveBeenCalled();

      // Verify getAllContracts and applyContractsToNeo4j were NOT called
      expect(service.getAllContracts).not.toHaveBeenCalled();
      expect(service.applyContractsToNeo4j).not.toHaveBeenCalled();
    });

    it("should include validation details in BadRequestException", async () => {
      const mockInvalidResult = {
        valid: false,
        files: [
          {
            filePath: "/path/to/invalid-contract.yml",
            fileName: "invalid-contract.yml",
            valid: false,
            errors: [
              {
                path: "dependencies.0.module_id",
                message: 'Referenced module "missing-module" does not exist',
              },
            ],
          },
        ],
      };

      jest
        .spyOn(service, "validateContracts")
        .mockResolvedValue(mockInvalidResult);

      try {
        await controller.applyContracts();
        fail("Should have thrown BadRequestException");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toMatchObject({
          message:
            "Contract validation failed. Cannot apply invalid contracts.",
          validation: mockInvalidResult,
        });
      }
    });

    it("should throw InternalServerErrorException when apply fails", async () => {
      // Mock validation success
      jest.spyOn(service, "validateContracts").mockResolvedValue({
        valid: true,
        files: [
          {
            filePath: "/path/to/contract1.yml",
            fileName: "contract1.yml",
            valid: true,
          },
        ],
      });

      // Mock getAllContracts
      jest
        .spyOn(service, "getAllContracts")
        .mockResolvedValue([mockContracts[0]]);

      // Mock applyContractsToNeo4j failure
      jest.spyOn(service, "applyContractsToNeo4j").mockResolvedValue({
        success: false,
        modulesProcessed: 0,
        partsProcessed: 0,
        message: "Failed to apply contracts to Neo4j: Connection error",
      });

      await expect(controller.applyContracts()).rejects.toThrow(
        InternalServerErrorException,
      );

      // Verify all methods were called
      expect(service.validateContracts).toHaveBeenCalled();
      expect(service.getAllContracts).toHaveBeenCalled();
      expect(service.applyContractsToNeo4j).toHaveBeenCalled();
    });

    it("should include error details in InternalServerErrorException", async () => {
      // Mock validation success
      jest.spyOn(service, "validateContracts").mockResolvedValue({
        valid: true,
        files: [
          {
            filePath: "/path/to/contract1.yml",
            fileName: "contract1.yml",
            valid: true,
          },
        ],
      });

      // Mock getAllContracts
      jest
        .spyOn(service, "getAllContracts")
        .mockResolvedValue([mockContracts[0]]);

      // Mock applyContractsToNeo4j failure
      const errorMessage =
        "Failed to apply contracts to Neo4j: Database timeout";
      jest.spyOn(service, "applyContractsToNeo4j").mockResolvedValue({
        success: false,
        modulesProcessed: 0,
        partsProcessed: 0,
        message: errorMessage,
      });

      try {
        await controller.applyContracts();
        fail("Should have thrown InternalServerErrorException");
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect(error.getResponse()).toMatchObject({
          message: "Failed to apply contracts to Neo4j database",
          details: errorMessage,
        });
      }
    });

    it("should call validateContracts before getAllContracts", async () => {
      const callOrder: string[] = [];

      jest.spyOn(service, "validateContracts").mockImplementation(async () => {
        callOrder.push("validateContracts");
        return {
          valid: true,
          files: [
            {
              filePath: "/path/to/contract1.yml",
              fileName: "contract1.yml",
              valid: true,
            },
          ],
        };
      });

      jest.spyOn(service, "getAllContracts").mockImplementation(async () => {
        callOrder.push("getAllContracts");
        return [mockContracts[0]];
      });

      jest
        .spyOn(service, "applyContractsToNeo4j")
        .mockImplementation(async () => {
          callOrder.push("applyContractsToNeo4j");
          return mockApplySuccessResult;
        });

      await controller.applyContracts();

      expect(callOrder).toEqual([
        "validateContracts",
        "getAllContracts",
        "applyContractsToNeo4j",
      ]);
    });

    it("should pass correct contract data to applyContractsToNeo4j", async () => {
      // Mock validation success
      jest.spyOn(service, "validateContracts").mockResolvedValue({
        valid: true,
        files: mockContracts.map((c) => ({
          filePath: c.filePath,
          fileName: c.fileName,
          valid: true,
        })),
      });

      // Mock getAllContracts
      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);

      // Mock applyContractsToNeo4j
      const applyContractsSpy = jest
        .spyOn(service, "applyContractsToNeo4j")
        .mockResolvedValue(mockApplySuccessResult);

      await controller.applyContracts();

      // Verify applyContractsToNeo4j was called with full ContractFileDto objects (including hash)
      expect(applyContractsSpy).toHaveBeenCalledWith(mockContracts);

      // Verify the contracts passed contain correct structure
      const calledWithContracts = applyContractsSpy.mock.calls[0][0];
      expect(calledWithContracts).toHaveLength(2);
      expect(calledWithContracts[0]).toHaveProperty("fileName");
      expect(calledWithContracts[0]).toHaveProperty("filePath");
      expect(calledWithContracts[0]).toHaveProperty("fileHash", "hash123");
      expect(calledWithContracts[0].content).toHaveProperty("id", "users-get");
      expect(calledWithContracts[0].content).toHaveProperty(
        "type",
        "controller",
      );
      expect(calledWithContracts[1]).toHaveProperty("fileHash", "hash456");
      expect(calledWithContracts[1].content).toHaveProperty(
        "id",
        "users-service",
      );
      expect(calledWithContracts[1].content).toHaveProperty("type", "service");
    });

    it("should handle empty contracts list", async () => {
      // Mock validation success with no files
      jest.spyOn(service, "validateContracts").mockResolvedValue({
        valid: true,
        files: [],
      });

      // Mock getAllContracts returning empty array
      jest.spyOn(service, "getAllContracts").mockResolvedValue([]);

      // Mock applyContractsToNeo4j
      jest.spyOn(service, "applyContractsToNeo4j").mockResolvedValue({
        success: true,
        modulesProcessed: 0,
        partsProcessed: 0,
        message: "Successfully applied 0 modules and 0 parts to Neo4j",
      });

      const result = await controller.applyContracts();

      expect(result.success).toBe(true);
      expect(result.modulesProcessed).toBe(0);
      expect(result.partsProcessed).toBe(0);
      expect(service.applyContractsToNeo4j).toHaveBeenCalledWith([]);
    });

    it("should propagate service errors for validation", async () => {
      jest
        .spyOn(service, "validateContracts")
        .mockRejectedValue(new Error("Service error during validation"));

      await expect(controller.applyContracts()).rejects.toThrow(
        "Service error during validation",
      );
    });

    it("should propagate service errors for getAllContracts", async () => {
      // Mock validation success
      jest.spyOn(service, "validateContracts").mockResolvedValue({
        valid: true,
        files: [],
      });

      jest
        .spyOn(service, "getAllContracts")
        .mockRejectedValue(new Error("Service error getting contracts"));

      await expect(controller.applyContracts()).rejects.toThrow(
        "Service error getting contracts",
      );
    });
  });

  describe("checkIfContractsModified", () => {
    it("should return check result when no changes detected", async () => {
      const mockCheckResult = {
        hasChanges: false,
        totalChanges: 0,
        modifiedCount: 0,
        addedCount: 0,
        removedCount: 0,
        changes: [],
      };

      jest
        .spyOn(service, "checkIfContractsModified")
        .mockResolvedValue(mockCheckResult);

      const result = await controller.checkIfContractsModified();

      expect(result).toEqual(mockCheckResult);
      expect(result.hasChanges).toBe(false);
      expect(result.totalChanges).toBe(0);
      expect(service.checkIfContractsModified).toHaveBeenCalled();
    });

    it("should return check result when changes are detected", async () => {
      const mockCheckResult = {
        hasChanges: true,
        totalChanges: 2,
        modifiedCount: 1,
        addedCount: 1,
        removedCount: 0,
        changes: [
          {
            moduleId: "modified-module",
            fileName: "modified.yml",
            filePath: "/contracts/modified.yml",
            currentHash: "newhash123",
            storedHash: "oldhash123",
            status: "modified" as const,
          },
          {
            moduleId: "added-module",
            fileName: "added.yml",
            filePath: "/contracts/added.yml",
            currentHash: "newhash456",
            storedHash: null,
            status: "added" as const,
          },
        ],
      };

      jest
        .spyOn(service, "checkIfContractsModified")
        .mockResolvedValue(mockCheckResult);

      const result = await controller.checkIfContractsModified();

      expect(result).toEqual(mockCheckResult);
      expect(result.hasChanges).toBe(true);
      expect(result.totalChanges).toBe(2);
      expect(result.modifiedCount).toBe(1);
      expect(result.addedCount).toBe(1);
      expect(result.removedCount).toBe(0);
      expect(result.changes).toHaveLength(2);
      expect(service.checkIfContractsModified).toHaveBeenCalled();
    });

    it("should return modified contracts with correct details", async () => {
      const mockCheckResult = {
        hasChanges: true,
        totalChanges: 1,
        modifiedCount: 1,
        addedCount: 0,
        removedCount: 0,
        changes: [
          {
            moduleId: "users-get",
            fileName: "users-get.yml",
            filePath: "/contracts/users-get.yml",
            currentHash:
              "a3d2f1e8b9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1",
            storedHash:
              "b4e3d2c1b0a9f8e7d6c5b4a3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3",
            status: "modified" as const,
          },
        ],
      };

      jest
        .spyOn(service, "checkIfContractsModified")
        .mockResolvedValue(mockCheckResult);

      const result = await controller.checkIfContractsModified();

      expect(result.changes[0]).toHaveProperty("moduleId");
      expect(result.changes[0]).toHaveProperty("fileName");
      expect(result.changes[0]).toHaveProperty("filePath");
      expect(result.changes[0]).toHaveProperty("currentHash");
      expect(result.changes[0]).toHaveProperty("storedHash");
      expect(result.changes[0]).toHaveProperty("status");
      expect(result.changes[0].status).toBe("modified");
    });

    it("should return added contracts with null stored hash", async () => {
      const mockCheckResult = {
        hasChanges: true,
        totalChanges: 1,
        modifiedCount: 0,
        addedCount: 1,
        removedCount: 0,
        changes: [
          {
            moduleId: "new-module",
            fileName: "new-module.yml",
            filePath: "/contracts/new-module.yml",
            currentHash: "newhash789",
            storedHash: null,
            status: "added" as const,
          },
        ],
      };

      jest
        .spyOn(service, "checkIfContractsModified")
        .mockResolvedValue(mockCheckResult);

      const result = await controller.checkIfContractsModified();

      expect(result.changes[0].status).toBe("added");
      expect(result.changes[0].storedHash).toBeNull();
      expect(result.addedCount).toBe(1);
    });

    it("should return removed contracts with empty current hash", async () => {
      const mockCheckResult = {
        hasChanges: true,
        totalChanges: 1,
        modifiedCount: 0,
        addedCount: 0,
        removedCount: 1,
        changes: [
          {
            moduleId: "removed-module",
            fileName: "unknown",
            filePath: "unknown",
            currentHash: "",
            storedHash: "oldhash999",
            status: "removed" as const,
          },
        ],
      };

      jest
        .spyOn(service, "checkIfContractsModified")
        .mockResolvedValue(mockCheckResult);

      const result = await controller.checkIfContractsModified();

      expect(result.changes[0].status).toBe("removed");
      expect(result.changes[0].currentHash).toBe("");
      expect(result.removedCount).toBe(1);
    });

    it("should handle multiple changes of different types", async () => {
      const mockCheckResult = {
        hasChanges: true,
        totalChanges: 3,
        modifiedCount: 1,
        addedCount: 1,
        removedCount: 1,
        changes: [
          {
            moduleId: "modified-module",
            fileName: "modified.yml",
            filePath: "/contracts/modified.yml",
            currentHash: "newhash111",
            storedHash: "oldhash111",
            status: "modified" as const,
          },
          {
            moduleId: "added-module",
            fileName: "added.yml",
            filePath: "/contracts/added.yml",
            currentHash: "newhash222",
            storedHash: null,
            status: "added" as const,
          },
          {
            moduleId: "removed-module",
            fileName: "unknown",
            filePath: "unknown",
            currentHash: "",
            storedHash: "oldhash333",
            status: "removed" as const,
          },
        ],
      };

      jest
        .spyOn(service, "checkIfContractsModified")
        .mockResolvedValue(mockCheckResult);

      const result = await controller.checkIfContractsModified();

      expect(result.totalChanges).toBe(3);
      expect(result.modifiedCount).toBe(1);
      expect(result.addedCount).toBe(1);
      expect(result.removedCount).toBe(1);

      const modified = result.changes.find((c) => c.status === "modified");
      const added = result.changes.find((c) => c.status === "added");
      const removed = result.changes.find((c) => c.status === "removed");

      expect(modified).toBeDefined();
      expect(added).toBeDefined();
      expect(removed).toBeDefined();
    });

    it("should propagate service errors", async () => {
      jest
        .spyOn(service, "checkIfContractsModified")
        .mockRejectedValue(
          new Error("Failed to check contract modifications: Neo4j error"),
        );

      await expect(controller.checkIfContractsModified()).rejects.toThrow(
        "Failed to check contract modifications: Neo4j error",
      );
    });

    it("should return empty changes array when no contracts exist", async () => {
      const mockCheckResult = {
        hasChanges: false,
        totalChanges: 0,
        modifiedCount: 0,
        addedCount: 0,
        removedCount: 0,
        changes: [],
      };

      jest
        .spyOn(service, "checkIfContractsModified")
        .mockResolvedValue(mockCheckResult);

      const result = await controller.checkIfContractsModified();

      expect(result.hasChanges).toBe(false);
      expect(result.changes).toEqual([]);
    });

    it("should correctly count different types of changes", async () => {
      const mockCheckResult = {
        hasChanges: true,
        totalChanges: 5,
        modifiedCount: 2,
        addedCount: 2,
        removedCount: 1,
        changes: [
          {
            moduleId: "mod1",
            fileName: "mod1.yml",
            filePath: "/contracts/mod1.yml",
            currentHash: "hash1",
            storedHash: "oldhash1",
            status: "modified" as const,
          },
          {
            moduleId: "mod2",
            fileName: "mod2.yml",
            filePath: "/contracts/mod2.yml",
            currentHash: "hash2",
            storedHash: "oldhash2",
            status: "modified" as const,
          },
          {
            moduleId: "add1",
            fileName: "add1.yml",
            filePath: "/contracts/add1.yml",
            currentHash: "hash3",
            storedHash: null,
            status: "added" as const,
          },
          {
            moduleId: "add2",
            fileName: "add2.yml",
            filePath: "/contracts/add2.yml",
            currentHash: "hash4",
            storedHash: null,
            status: "added" as const,
          },
          {
            moduleId: "rem1",
            fileName: "unknown",
            filePath: "unknown",
            currentHash: "",
            storedHash: "oldhash5",
            status: "removed" as const,
          },
        ],
      };

      jest
        .spyOn(service, "checkIfContractsModified")
        .mockResolvedValue(mockCheckResult);

      const result = await controller.checkIfContractsModified();

      expect(result.totalChanges).toBe(5);
      expect(result.modifiedCount).toBe(2);
      expect(result.addedCount).toBe(2);
      expect(result.removedCount).toBe(1);

      const modifiedChanges = result.changes.filter(
        (c) => c.status === "modified",
      );
      const addedChanges = result.changes.filter((c) => c.status === "added");
      const removedChanges = result.changes.filter(
        (c) => c.status === "removed",
      );

      expect(modifiedChanges).toHaveLength(2);
      expect(addedChanges).toHaveLength(2);
      expect(removedChanges).toHaveLength(1);
    });
  });

  describe("getModuleRelations", () => {
    it("should return module relations for a valid module", async () => {
      const mockRelations = {
        module_id: "users-service",
        outgoing_dependencies: [
          {
            module_id: "auth-service",
            parts: [
              { part_id: "authenticate", type: "function" },
              { part_id: "validateToken", type: "function" },
            ],
          },
        ],
        incoming_dependencies: [
          {
            module_id: "users-controller",
            parts: [
              { part_id: "findUser", type: "function" },
              { part_id: "listUsers", type: "function" },
            ],
          },
        ],
      };

      jest
        .spyOn(service, "getModuleRelations")
        .mockResolvedValue(mockRelations);

      const result = await controller.getModuleRelations("users-service");

      expect(result).toEqual(mockRelations);
      expect(service.getModuleRelations).toHaveBeenCalledWith("users-service");
    });

    it("should return module relations with no dependencies", async () => {
      const mockRelations = {
        module_id: "standalone-module",
        outgoing_dependencies: [],
        incoming_dependencies: [],
      };

      jest
        .spyOn(service, "getModuleRelations")
        .mockResolvedValue(mockRelations);

      const result = await controller.getModuleRelations("standalone-module");

      expect(result).toEqual(mockRelations);
      expect(result.outgoing_dependencies).toHaveLength(0);
      expect(result.incoming_dependencies).toHaveLength(0);
    });

    it("should return module relations with only outgoing dependencies", async () => {
      const mockRelations = {
        module_id: "users-controller",
        outgoing_dependencies: [
          {
            module_id: "users-service",
            parts: [{ part_id: "findUser", type: "function" }],
          },
          {
            module_id: "auth-service",
            parts: [{ part_id: "checkPermission", type: "function" }],
          },
        ],
        incoming_dependencies: [],
      };

      jest
        .spyOn(service, "getModuleRelations")
        .mockResolvedValue(mockRelations);

      const result = await controller.getModuleRelations("users-controller");

      expect(result).toEqual(mockRelations);
      expect(result.outgoing_dependencies).toHaveLength(2);
      expect(result.incoming_dependencies).toHaveLength(0);
    });

    it("should return module relations with only incoming dependencies", async () => {
      const mockRelations = {
        module_id: "auth-service",
        outgoing_dependencies: [],
        incoming_dependencies: [
          {
            module_id: "users-service",
            parts: [{ part_id: "authenticate", type: "function" }],
          },
          {
            module_id: "orders-service",
            parts: [{ part_id: "validateToken", type: "function" }],
          },
        ],
      };

      jest
        .spyOn(service, "getModuleRelations")
        .mockResolvedValue(mockRelations);

      const result = await controller.getModuleRelations("auth-service");

      expect(result).toEqual(mockRelations);
      expect(result.outgoing_dependencies).toHaveLength(0);
      expect(result.incoming_dependencies).toHaveLength(2);
    });

    it("should throw NotFoundException when module does not exist", async () => {
      jest
        .spyOn(service, "getModuleRelations")
        .mockRejectedValue(
          new Error('Module with id "non-existent-module" not found'),
        );

      await expect(
        controller.getModuleRelations("non-existent-module"),
      ).rejects.toThrow(NotFoundException);

      expect(service.getModuleRelations).toHaveBeenCalledWith(
        "non-existent-module",
      );
    });

    it("should include correct module_id in the response", async () => {
      const mockRelations = {
        module_id: "test-module",
        outgoing_dependencies: [],
        incoming_dependencies: [],
      };

      jest
        .spyOn(service, "getModuleRelations")
        .mockResolvedValue(mockRelations);

      const result = await controller.getModuleRelations("test-module");

      expect(result.module_id).toBe("test-module");
    });

    it("should propagate service errors that are not 'not found'", async () => {
      jest
        .spyOn(service, "getModuleRelations")
        .mockRejectedValue(new Error("Database connection failed"));

      await expect(
        controller.getModuleRelations("users-service"),
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle module with multiple outgoing dependencies and parts", async () => {
      const mockRelations = {
        module_id: "complex-module",
        outgoing_dependencies: [
          {
            module_id: "dep1",
            parts: [
              { part_id: "func1", type: "function" },
              { part_id: "func2", type: "function" },
              { part_id: "class1", type: "class" },
            ],
          },
          {
            module_id: "dep2",
            parts: [{ part_id: "interface1", type: "interface" }],
          },
        ],
        incoming_dependencies: [
          {
            module_id: "dependent1",
            parts: [
              { part_id: "export1", type: "function" },
              { part_id: "export2", type: "class" },
            ],
          },
        ],
      };

      jest
        .spyOn(service, "getModuleRelations")
        .mockResolvedValue(mockRelations);

      const result = await controller.getModuleRelations("complex-module");

      expect(result).toEqual(mockRelations);
      expect(result.outgoing_dependencies[0].parts).toHaveLength(3);
      expect(result.outgoing_dependencies[1].parts).toHaveLength(1);
      expect(result.incoming_dependencies[0].parts).toHaveLength(2);
    });

    it("should verify parts structure in dependencies", async () => {
      const mockRelations = {
        module_id: "users-service",
        outgoing_dependencies: [
          {
            module_id: "auth-service",
            parts: [{ part_id: "authenticate", type: "function" }],
          },
        ],
        incoming_dependencies: [
          {
            module_id: "users-controller",
            parts: [{ part_id: "findUser", type: "function" }],
          },
        ],
      };

      jest
        .spyOn(service, "getModuleRelations")
        .mockResolvedValue(mockRelations);

      const result = await controller.getModuleRelations("users-service");

      // Verify outgoing dependency parts structure
      expect(result.outgoing_dependencies[0].parts[0]).toHaveProperty(
        "part_id",
      );
      expect(result.outgoing_dependencies[0].parts[0]).toHaveProperty("type");
      expect(result.outgoing_dependencies[0].parts[0].part_id).toBe(
        "authenticate",
      );
      expect(result.outgoing_dependencies[0].parts[0].type).toBe("function");

      // Verify incoming dependency parts structure
      expect(result.incoming_dependencies[0].parts[0]).toHaveProperty(
        "part_id",
      );
      expect(result.incoming_dependencies[0].parts[0]).toHaveProperty("type");
      expect(result.incoming_dependencies[0].parts[0].part_id).toBe("findUser");
      expect(result.incoming_dependencies[0].parts[0].type).toBe("function");
    });
  });

  describe("searchByDescription", () => {
    const mockSearchResults = {
      query: "user authentication",
      resultsCount: 3,
      results: [
        {
          fileName: "auth-service.yml",
          filePath: "/contracts/auth-service.yml",
          fileHash: "hash1",
          content: {
            id: "auth-service",
            type: "service",
            description: "Authentication service for user login",
            category: "backend",
          },
          similarity: 0.92,
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
          similarity: 0.78,
        },
        {
          fileName: "login-controller.yml",
          filePath: "/contracts/login-controller.yml",
          fileHash: "hash3",
          content: {
            id: "login-controller",
            type: "controller",
            description: "User login endpoint",
            category: "api",
          },
          similarity: 0.65,
        },
      ],
    };

    it("should return search results for a valid query", async () => {
      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockSearchResults);

      const result = await controller.searchByDescription(
        "user authentication",
      );

      expect(result).toEqual(mockSearchResults);
      expect(result.query).toBe("user authentication");
      expect(result.resultsCount).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(service.searchByDescription).toHaveBeenCalledWith(
        "user authentication",
        10,
        undefined,
        undefined,
      );
    });

    it("should return search results with custom limit", async () => {
      const mockCustomResults = {
        ...mockSearchResults,
        resultsCount: 2,
        results: mockSearchResults.results.slice(0, 2),
      };

      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockCustomResults);

      const result = await controller.searchByDescription(
        "user authentication",
        "5",
      );

      expect(result).toEqual(mockCustomResults);
      expect(service.searchByDescription).toHaveBeenCalledWith(
        "user authentication",
        5,
        undefined,
        undefined,
      );
    });

    it("should use default limit when not provided", async () => {
      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockSearchResults);

      await controller.searchByDescription("user authentication");

      expect(service.searchByDescription).toHaveBeenCalledWith(
        "user authentication",
        10,
        undefined,
        undefined,
      );
    });

    it("should return results ordered by similarity (highest first)", async () => {
      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockSearchResults);

      const result = await controller.searchByDescription(
        "user authentication",
      );

      // Verify results are ordered by similarity descending
      for (let i = 0; i < result.results.length - 1; i++) {
        expect(result.results[i].similarity).toBeGreaterThanOrEqual(
          result.results[i + 1].similarity,
        );
      }
    });

    it("should include all required fields in search results", async () => {
      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockSearchResults);

      const result = await controller.searchByDescription(
        "user authentication",
      );

      result.results.forEach((item) => {
        expect(item).toHaveProperty("fileName");
        expect(item).toHaveProperty("filePath");
        expect(item).toHaveProperty("content");
        expect(item).toHaveProperty("fileHash");
        expect(item).toHaveProperty("similarity");
        expect(item.content).toHaveProperty("id");
        expect(item.content).toHaveProperty("type");
        expect(item.content).toHaveProperty("description");
        expect(item.content).toHaveProperty("category");
        expect(typeof item.similarity).toBe("number");
        expect(item.similarity).toBeGreaterThan(0);
        expect(item.similarity).toBeLessThanOrEqual(1);
      });
    });

    it("should return empty results when no matches found", async () => {
      const mockEmptyResults = {
        query: "nonexistent module",
        resultsCount: 0,
        results: [],
      };

      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockEmptyResults);

      const result = await controller.searchByDescription("nonexistent module");

      expect(result.resultsCount).toBe(0);
      expect(result.results).toEqual([]);
    });

    it("should throw BadRequestException for empty query", async () => {
      await expect(controller.searchByDescription("")).rejects.toThrow(
        BadRequestException,
      );

      expect(service.searchByDescription).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for whitespace-only query", async () => {
      await expect(controller.searchByDescription("   ")).rejects.toThrow(
        BadRequestException,
      );

      expect(service.searchByDescription).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for invalid limit (not a number)", async () => {
      await expect(
        controller.searchByDescription("test query", "invalid"),
      ).rejects.toThrow(BadRequestException);

      expect(service.searchByDescription).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for negative limit", async () => {
      await expect(
        controller.searchByDescription("test query", "-5"),
      ).rejects.toThrow(BadRequestException);

      expect(service.searchByDescription).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for zero limit", async () => {
      await expect(
        controller.searchByDescription("test query", "0"),
      ).rejects.toThrow(BadRequestException);

      expect(service.searchByDescription).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for limit exceeding 100", async () => {
      await expect(
        controller.searchByDescription("test query", "101"),
      ).rejects.toThrow(BadRequestException);

      expect(service.searchByDescription).not.toHaveBeenCalled();
    });

    it("should accept limit of 100", async () => {
      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockSearchResults);

      await controller.searchByDescription("test query", "100");

      expect(service.searchByDescription).toHaveBeenCalledWith(
        "test query",
        100,
        undefined,
        undefined,
      );
    });

    it("should throw InternalServerErrorException when embedding service is not ready", async () => {
      jest
        .spyOn(service, "searchByDescription")
        .mockRejectedValue(
          new Error(
            "Embedding service is not ready. Cannot perform semantic search.",
          ),
        );

      await expect(
        controller.searchByDescription("test query"),
      ).rejects.toThrow(InternalServerErrorException);

      expect(service.searchByDescription).toHaveBeenCalledWith(
        "test query",
        10,
        undefined,
        undefined,
      );
    });

    it("should throw InternalServerErrorException for Neo4j errors", async () => {
      jest
        .spyOn(service, "searchByDescription")
        .mockRejectedValue(new Error("Neo4j connection failed"));

      await expect(
        controller.searchByDescription("test query"),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it("should propagate service errors with proper message", async () => {
      jest
        .spyOn(service, "searchByDescription")
        .mockRejectedValue(new Error("Database timeout"));

      try {
        await controller.searchByDescription("test query");
        fail("Should have thrown InternalServerErrorException");
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect(error.message).toContain("Failed to search modules");
      }
    });

    it("should handle queries with special characters", async () => {
      const queryWithSpecialChars = "user's authentication & authorization";
      jest.spyOn(service, "searchByDescription").mockResolvedValue({
        ...mockSearchResults,
        query: queryWithSpecialChars,
      });

      const result = await controller.searchByDescription(
        queryWithSpecialChars,
      );

      expect(result.query).toBe(queryWithSpecialChars);
      expect(service.searchByDescription).toHaveBeenCalledWith(
        queryWithSpecialChars,
        10,
        undefined,
        undefined,
      );
    });

    it("should handle long queries", async () => {
      const longQuery =
        "This is a very long query describing a complex module that handles user authentication, authorization, session management, and token validation with advanced security features";
      const mockLongQueryResults = {
        ...mockSearchResults,
        query: longQuery,
      };
      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockLongQueryResults);

      const result = await controller.searchByDescription(longQuery);

      expect(result.query).toBe(longQuery);
      expect(service.searchByDescription).toHaveBeenCalledWith(
        longQuery,
        10,
        undefined,
        undefined,
      );
    });

    it("should handle queries with multiple modules in results", async () => {
      const manyResults = {
        query: "service",
        resultsCount: 10,
        results: Array(10)
          .fill(null)
          .map((_, i) => ({
            fileName: `service-${i}.yml`,
            filePath: `/contracts/service-${i}.yml`,
            fileHash: `hash${i}`,
            content: {
              id: `service-${i}`,
              type: "service",
              description: `Service number ${i}`,
              category: "backend",
            },
            similarity: 0.9 - i * 0.05,
          })),
      };

      jest.spyOn(service, "searchByDescription").mockResolvedValue(manyResults);

      const result = await controller.searchByDescription("service");

      expect(result.resultsCount).toBe(10);
      expect(result.results).toHaveLength(10);
    });

    it("should return query exactly as provided", async () => {
      const query = "  USER Authentication  ";
      const mockQueryResults = {
        ...mockSearchResults,
        query,
      };
      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockQueryResults);

      const result = await controller.searchByDescription(query);

      // Note: Controller validates trimmed query, but passes original to service
      expect(service.searchByDescription).toHaveBeenCalledWith(
        query,
        10,
        undefined,
        undefined,
      );
    });

    it("should filter by type when type parameter is provided", async () => {
      const mockFilteredResults = {
        ...mockSearchResults,
        resultsCount: 1,
        results: [mockSearchResults.results[0]],
      };

      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockFilteredResults);

      const result = await controller.searchByDescription(
        "user authentication",
        undefined,
        "service",
      );

      expect(result).toEqual(mockFilteredResults);
      expect(service.searchByDescription).toHaveBeenCalledWith(
        "user authentication",
        10,
        "service",
        undefined,
      );
    });

    it("should filter by category when category parameter is provided", async () => {
      const mockFilteredResults = {
        ...mockSearchResults,
        resultsCount: 2,
        results: mockSearchResults.results.slice(0, 2),
      };

      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockFilteredResults);

      const result = await controller.searchByDescription(
        "user authentication",
        undefined,
        undefined,
        "backend",
      );

      expect(result).toEqual(mockFilteredResults);
      expect(service.searchByDescription).toHaveBeenCalledWith(
        "user authentication",
        10,
        undefined,
        "backend",
      );
    });

    it("should filter by both type and category when both parameters are provided", async () => {
      const mockFilteredResults = {
        ...mockSearchResults,
        resultsCount: 1,
        results: [mockSearchResults.results[0]],
      };

      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockFilteredResults);

      const result = await controller.searchByDescription(
        "user authentication",
        undefined,
        "service",
        "backend",
      );

      expect(result).toEqual(mockFilteredResults);
      expect(service.searchByDescription).toHaveBeenCalledWith(
        "user authentication",
        10,
        "service",
        "backend",
      );
    });

    it("should filter with custom limit and filters", async () => {
      const mockFilteredResults = {
        ...mockSearchResults,
        resultsCount: 1,
        results: [mockSearchResults.results[0]],
      };

      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockFilteredResults);

      const result = await controller.searchByDescription(
        "user authentication",
        "20",
        "service",
        "backend",
      );

      expect(result).toEqual(mockFilteredResults);
      expect(service.searchByDescription).toHaveBeenCalledWith(
        "user authentication",
        20,
        "service",
        "backend",
      );
    });

    it("should return empty results when filters match no modules", async () => {
      const mockEmptyResults = {
        query: "user authentication",
        resultsCount: 0,
        results: [],
      };

      jest
        .spyOn(service, "searchByDescription")
        .mockResolvedValue(mockEmptyResults);

      const result = await controller.searchByDescription(
        "user authentication",
        undefined,
        "nonexistent-type",
      );

      expect(result.resultsCount).toBe(0);
      expect(result.results).toEqual([]);
    });
  });

  describe("getContractTypes", () => {
    it("should return all unique contract types", async () => {
      const mockTypesResult = {
        types: ["controller", "service", "component"],
        count: 3,
      };

      jest
        .spyOn(service, "getContractTypes")
        .mockResolvedValue(mockTypesResult);

      const result = await controller.getContractTypes();

      expect(result).toEqual(mockTypesResult);
      expect(result.types).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(service.getContractTypes).toHaveBeenCalled();
    });

    it("should return sorted types alphabetically", async () => {
      const mockTypesResult = {
        types: ["component", "controller", "service"],
        count: 3,
      };

      jest
        .spyOn(service, "getContractTypes")
        .mockResolvedValue(mockTypesResult);

      const result = await controller.getContractTypes();

      // Verify types are sorted
      const sortedTypes = [...result.types].sort();
      expect(result.types).toEqual(sortedTypes);
    });

    it("should return empty array when no contracts exist", async () => {
      const mockEmptyResult = {
        types: [],
        count: 0,
      };

      jest
        .spyOn(service, "getContractTypes")
        .mockResolvedValue(mockEmptyResult);

      const result = await controller.getContractTypes();

      expect(result.types).toEqual([]);
      expect(result.count).toBe(0);
    });

    it("should return unique types without duplicates", async () => {
      const mockTypesResult = {
        types: ["controller", "service"],
        count: 2,
      };

      jest
        .spyOn(service, "getContractTypes")
        .mockResolvedValue(mockTypesResult);

      const result = await controller.getContractTypes();

      // Check for uniqueness
      const uniqueTypes = new Set(result.types);
      expect(uniqueTypes.size).toBe(result.types.length);
    });

    it("should include all expected type fields in response", async () => {
      const mockTypesResult = {
        types: ["controller", "service", "component", "repository"],
        count: 4,
      };

      jest
        .spyOn(service, "getContractTypes")
        .mockResolvedValue(mockTypesResult);

      const result = await controller.getContractTypes();

      expect(result).toHaveProperty("types");
      expect(result).toHaveProperty("count");
      expect(Array.isArray(result.types)).toBe(true);
      expect(typeof result.count).toBe("number");
    });

    it("should return count matching types array length", async () => {
      const mockTypesResult = {
        types: ["controller", "service", "component"],
        count: 3,
      };

      jest
        .spyOn(service, "getContractTypes")
        .mockResolvedValue(mockTypesResult);

      const result = await controller.getContractTypes();

      expect(result.count).toBe(result.types.length);
    });

    it("should handle single type correctly", async () => {
      const mockTypesResult = {
        types: ["service"],
        count: 1,
      };

      jest
        .spyOn(service, "getContractTypes")
        .mockResolvedValue(mockTypesResult);

      const result = await controller.getContractTypes();

      expect(result.types).toHaveLength(1);
      expect(result.types[0]).toBe("service");
      expect(result.count).toBe(1);
    });

    it("should handle many types correctly", async () => {
      const manyTypes = Array.from({ length: 20 }, (_, i) => `type-${i}`);
      const mockTypesResult = {
        types: manyTypes,
        count: 20,
      };

      jest
        .spyOn(service, "getContractTypes")
        .mockResolvedValue(mockTypesResult);

      const result = await controller.getContractTypes();

      expect(result.types).toHaveLength(20);
      expect(result.count).toBe(20);
    });

    it("should throw InternalServerErrorException when service fails", async () => {
      jest
        .spyOn(service, "getContractTypes")
        .mockRejectedValue(new Error("Failed to get contract types"));

      await expect(controller.getContractTypes()).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(service.getContractTypes).toHaveBeenCalled();
    });

    it("should include error details in InternalServerErrorException", async () => {
      const errorMessage = "Database connection failed";
      jest
        .spyOn(service, "getContractTypes")
        .mockRejectedValue(new Error(errorMessage));

      try {
        await controller.getContractTypes();
        fail("Should have thrown InternalServerErrorException");
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect(error.message).toContain("Failed to get contract types");
        expect(error.message).toContain(errorMessage);
      }
    });

    it("should propagate service errors properly", async () => {
      jest
        .spyOn(service, "getContractTypes")
        .mockRejectedValue(new Error("CONTRACTS_PATH not set"));

      await expect(controller.getContractTypes()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it("should verify service method is called without parameters", async () => {
      const mockTypesResult = {
        types: ["controller"],
        count: 1,
      };

      const getContractTypesSpy = jest
        .spyOn(service, "getContractTypes")
        .mockResolvedValue(mockTypesResult);

      await controller.getContractTypes();

      expect(getContractTypesSpy).toHaveBeenCalledWith();
      expect(getContractTypesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCategories", () => {
    it("should return list of categories", async () => {
      const mockCategoriesResult = {
        categories: ["api", "service", "frontend"],
      };

      jest
        .spyOn(service, "getCategoriesList")
        .mockResolvedValue(mockCategoriesResult);

      const result = await controller.getCategories();

      expect(result).toEqual(mockCategoriesResult);
      expect(result.categories).toHaveLength(3);
      expect(service.getCategoriesList).toHaveBeenCalled();
    });

    it("should return empty array when no categories exist", async () => {
      const mockEmptyResult = {
        categories: [],
      };

      jest
        .spyOn(service, "getCategoriesList")
        .mockResolvedValue(mockEmptyResult);

      const result = await controller.getCategories();

      expect(result.categories).toEqual([]);
      expect(result.categories).toHaveLength(0);
    });

    it("should return categories in alphabetical order", async () => {
      const mockCategoriesResult = {
        categories: ["api", "backend", "frontend", "service"],
      };

      jest
        .spyOn(service, "getCategoriesList")
        .mockResolvedValue(mockCategoriesResult);

      const result = await controller.getCategories();

      // Verify categories are sorted
      const sortedCategories = [...result.categories].sort();
      expect(result.categories).toEqual(sortedCategories);
    });

    it("should return only unique categories", async () => {
      const mockCategoriesResult = {
        categories: ["api", "frontend", "service"],
      };

      jest
        .spyOn(service, "getCategoriesList")
        .mockResolvedValue(mockCategoriesResult);

      const result = await controller.getCategories();

      // Verify all categories are unique
      const uniqueCategories = [...new Set(result.categories)];
      expect(result.categories).toEqual(uniqueCategories);
    });

    it("should throw InternalServerErrorException when service fails", async () => {
      jest
        .spyOn(service, "getCategoriesList")
        .mockRejectedValue(new Error("Database connection failed"));

      await expect(controller.getCategories()).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(service.getCategoriesList).toHaveBeenCalled();
    });

    it("should include error message in exception", async () => {
      const errorMessage = "Neo4j connection timeout";
      jest
        .spyOn(service, "getCategoriesList")
        .mockRejectedValue(new Error(errorMessage));

      try {
        await controller.getCategories();
        fail("Should have thrown InternalServerErrorException");
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect(error.message).toContain("Failed to fetch categories");
        expect(error.message).toContain(errorMessage);
      }
    });

    it("should handle single category", async () => {
      const mockCategoriesResult = {
        categories: ["api"],
      };

      jest
        .spyOn(service, "getCategoriesList")
        .mockResolvedValue(mockCategoriesResult);

      const result = await controller.getCategories();

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0]).toBe("api");
    });

    it("should return all categories as strings", async () => {
      const mockCategoriesResult = {
        categories: ["api", "service", "frontend", "backend"],
      };

      jest
        .spyOn(service, "getCategoriesList")
        .mockResolvedValue(mockCategoriesResult);

      const result = await controller.getCategories();

      result.categories.forEach((category) => {
        expect(typeof category).toBe("string");
      });
    });
  });
});
