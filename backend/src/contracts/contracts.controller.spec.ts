import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  InternalServerErrorException,
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
      jest.spyOn(service, "getAllContracts").mockResolvedValue([mockContracts[0]]);

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
      jest.spyOn(service, "getAllContracts").mockResolvedValue([mockContracts[0]]);

      // Mock applyContractsToNeo4j failure
      const errorMessage = "Failed to apply contracts to Neo4j: Database timeout";
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
      expect(calledWithContracts[0].content).toHaveProperty("type", "controller");
      expect(calledWithContracts[1]).toHaveProperty("fileHash", "hash456");
      expect(calledWithContracts[1].content).toHaveProperty("id", "users-service");
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
});
