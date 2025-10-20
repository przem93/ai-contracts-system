import { Test, TestingModule } from "@nestjs/testing";
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
          content: { id: "test", type: "service" },
        },
      ];

      jest.spyOn(service, "getAllContracts").mockResolvedValue(mockContracts);

      const result = await controller.getAllContracts();

      expect(result).toEqual(mockContracts);
      expect(service.getAllContracts).toHaveBeenCalled();
    });
  });
});
