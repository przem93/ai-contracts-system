import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { glob } from "glob";
import { ContractSchema } from "./contract.schema";

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private configService: ConfigService) {}

  async getAllContracts(): Promise<any[]> {
    const contractsPath = this.configService.get<string>("CONTRACTS_PATH");

    if (!contractsPath) {
      this.logger.error("CONTRACTS_PATH environment variable is not set");
      throw new Error("CONTRACTS_PATH environment variable is not set");
    }

    this.logger.log(`Loading contracts from: ${contractsPath}`);

    try {
      // Resolve the glob pattern to find all matching YAML files
      const files = await glob(contractsPath, {
        absolute: true,
      });

      if (files.length === 0) {
        this.logger.warn(
          `No contract files found matching pattern: ${contractsPath}`,
        );
        return [];
      }

      this.logger.log(`Found ${files.length} contract file(s)`);

      // Parse each YAML file
      const contracts = [];
      for (const file of files) {
        try {
          const fileContent = fs.readFileSync(file, "utf8");
          const parsedContract = yaml.load(fileContent);

          contracts.push({
            fileName: path.basename(file),
            filePath: file,
            content: parsedContract,
          });

          this.logger.log(`Successfully parsed: ${path.basename(file)}`);
        } catch (error) {
          this.logger.error(`Error parsing file ${file}:`, error.message);
          // Continue with other files even if one fails
        }
      }

      return contracts;
    } catch (error) {
      this.logger.error("Error loading contracts:", error.message);
      throw new Error(`Failed to load contracts: ${error.message}`);
    }
  }

  async validateContracts(): Promise<{
    valid: boolean;
    files: Array<{
      filePath: string;
      fileName: string;
      valid: boolean;
      errors?: Array<{
        path: string;
        message: string;
      }>;
    }>;
  }> {
    const contractsPath = this.configService.get<string>("CONTRACTS_PATH");

    if (!contractsPath) {
      this.logger.error("CONTRACTS_PATH environment variable is not set");
      throw new Error("CONTRACTS_PATH environment variable is not set");
    }

    this.logger.log(`Validating contracts from: ${contractsPath}`);

    try {
      // Resolve the glob pattern to find all matching YAML files
      const files = await glob(contractsPath, {
        absolute: true,
      });

      if (files.length === 0) {
        this.logger.warn(
          `No contract files found matching pattern: ${contractsPath}`,
        );
        return {
          valid: true,
          files: [],
        };
      }

      this.logger.log(`Validating ${files.length} contract file(s)`);

      const validationResults = [];
      let allValid = true;

      for (const file of files) {
        const fileName = path.basename(file);
        try {
          const fileContent = fs.readFileSync(file, "utf8");
          const parsedContract = yaml.load(fileContent);

          // Validate the parsed contract against the schema
          const validationResult = ContractSchema.safeParse(parsedContract);

          if (validationResult.success) {
            validationResults.push({
              filePath: file,
              fileName,
              valid: true,
            });
            this.logger.log(`✓ Valid: ${fileName}`);
          } else {
            allValid = false;
            const errors = validationResult.error.issues.map((err) => ({
              path: err.path.join(".") || "root",
              message: err.message,
            }));

            validationResults.push({
              filePath: file,
              fileName,
              valid: false,
              errors,
            });
            this.logger.warn(`✗ Invalid: ${fileName}`);
          }
        } catch (error) {
          allValid = false;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          validationResults.push({
            filePath: file,
            fileName,
            valid: false,
            errors: [
              {
                path: "file",
                message: `Failed to parse YAML: ${errorMessage}`,
              },
            ],
          });
          this.logger.error(`✗ Parse error in ${fileName}:`, errorMessage);
        }
      }

      return {
        valid: allValid,
        files: validationResults,
      };
    } catch (error) {
      this.logger.error("Error validating contracts:", error.message);
      throw new Error(`Failed to validate contracts: ${error.message}`);
    }
  }
}
