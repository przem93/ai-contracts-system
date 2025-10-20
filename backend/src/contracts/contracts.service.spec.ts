import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ContractsService } from "./contracts.service";
import * as path from "path";

describe("ContractsService", () => {
  let service: ContractsService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    configService = module.get<ConfigService>(ConfigService);
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
  });

  describe("getAllContracts", () => {
    it("should throw error when CONTRACTS_PATH is not set", async () => {
      jest.spyOn(configService, "get").mockReturnValue(undefined);

      await expect(service.getAllContracts()).rejects.toThrow(
        "CONTRACTS_PATH environment variable is not set",
      );
    });
  });
});
