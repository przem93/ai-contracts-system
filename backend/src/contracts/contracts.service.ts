import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as yaml from "js-yaml";
import { glob } from "glob";
import { ContractSchema, Contract } from "./contract.schema";
import { ContractFileDto } from "./dto/contract-response.dto";
import { Neo4jService } from "../neo4j/neo4j.service";
import {
  CheckModifiedResponseDto,
  ModifiedContractDto,
} from "./dto/check-modified-response.dto";

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private configService: ConfigService,
    private neo4jService: Neo4jService,
  ) {}

  async getAllContracts(): Promise<ContractFileDto[]> {
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
      const contracts: ContractFileDto[] = [];
      for (const file of files) {
        try {
          const fileContent = fs.readFileSync(file, "utf8");
          const parsedContract = yaml.load(fileContent) as Contract;

          // Calculate SHA256 hash of the file content
          const fileHash = crypto
            .createHash("sha256")
            .update(fileContent)
            .digest("hex");

          contracts.push({
            fileName: path.basename(file),
            filePath: file,
            content: parsedContract,
            fileHash,
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

      // First pass: Parse all contracts and collect their IDs and parts
      const parsedContracts: Array<{
        file: string;
        fileName: string;
        contract: any;
      }> = [];
      const availableModuleIds = new Set<string>();
      const moduleParts: Map<
        string,
        Array<{ id: string; type: string }>
      > = new Map();

      for (const file of files) {
        const fileName = path.basename(file);
        try {
          const fileContent = fs.readFileSync(file, "utf8");
          const parsedContract = yaml.load(fileContent);

          parsedContracts.push({
            file,
            fileName,
            contract: parsedContract,
          });

          // Collect module IDs and parts for cross-contract validation
          if (
            parsedContract &&
            typeof parsedContract === "object" &&
            "id" in parsedContract &&
            typeof parsedContract.id === "string"
          ) {
            availableModuleIds.add(parsedContract.id);

            // Store module parts for type validation
            if (
              "parts" in parsedContract &&
              parsedContract.parts &&
              Array.isArray(parsedContract.parts)
            ) {
              moduleParts.set(parsedContract.id, parsedContract.parts);
            }
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

      // Second pass: Validate each contract with cross-contract validation
      for (const { file, fileName, contract } of parsedContracts) {
        // Validate the parsed contract against the schema
        const validationResult = ContractSchema.safeParse(contract);

        const errors: Array<{ path: string; message: string }> = [];

        // Add schema validation errors
        if (!validationResult.success) {
          errors.push(
            ...validationResult.error.issues.map((err) => ({
              path: err.path.join(".") || "root",
              message: err.message,
            })),
          );
        }

        // Cross-contract validation: Check if referenced module IDs exist
        if (validationResult.success && contract.dependencies) {
          for (let i = 0; i < contract.dependencies.length; i++) {
            const dep = contract.dependencies[i];
            if (!availableModuleIds.has(dep.module_id)) {
              errors.push({
                path: `dependencies.${i}.module_id`,
                message: `Referenced module "${dep.module_id}" does not exist`,
              });
            } else {
              // Validate dependency part types
              const referencedParts = moduleParts.get(dep.module_id);
              if (dep.parts && Array.isArray(dep.parts)) {
                for (let j = 0; j < dep.parts.length; j++) {
                  const depPart = dep.parts[j];
                  if (referencedParts) {
                    const matchingPart = referencedParts.find(
                      (p) => p.id === depPart.part_id,
                    );
                    if (matchingPart && matchingPart.type !== depPart.type) {
                      errors.push({
                        path: `dependencies.${i}.parts.${j}.type`,
                        message: `Part type mismatch: expected "${matchingPart.type}" but got "${depPart.type}"`,
                      });
                    }
                  }
                }
              }
            }
          }
        }

        // Determine if this file is valid
        if (errors.length === 0) {
          validationResults.push({
            filePath: file,
            fileName,
            valid: true,
          });
          this.logger.log(`✓ Valid: ${fileName}`);
        } else {
          allValid = false;
          validationResults.push({
            filePath: file,
            fileName,
            valid: false,
            errors,
          });
          this.logger.warn(`✗ Invalid: ${fileName}`);
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

  /**
   * Apply contracts data to Neo4j database
   * Clears all existing data and creates Module nodes, Part nodes, and their relationships
   * @param contractFiles Array of contract files with hash to apply
   * @returns Object with success status and number of modules processed
   */
  async applyContractsToNeo4j(contractFiles: ContractFileDto[]): Promise<{
    success: boolean;
    modulesProcessed: number;
    partsProcessed: number;
    message: string;
  }> {
    const session = this.neo4jService.getSession();

    try {
      // Clear all existing data from the database (reset)
      this.logger.log("Clearing all existing data from Neo4j database...");
      await session.run("MATCH (n) DETACH DELETE n");
      this.logger.log("✓ Database cleared successfully");

      this.logger.log(
        `Starting to apply ${contractFiles.length} contracts to Neo4j`,
      );

      let totalModulesProcessed = 0;
      let totalPartsProcessed = 0;

      // Process each contract
      for (const contractFile of contractFiles) {
        const contract = contractFile.content;
        
        // Create or merge Module node with file hash
        await session.run(
          `
          MERGE (m:Module {module_id: $module_id})
          SET m.type = $type,
              m.description = $description,
              m.category = $category,
              m.contractFileHash = $contractFileHash
          RETURN m
          `,
          {
            module_id: contract.id,
            type: contract.type,
            description: contract.description,
            category: contract.category,
            contractFileHash: contractFile.fileHash,
          },
        );

        totalModulesProcessed++;
        this.logger.log(`Created/updated module: ${contract.id}`);

        // Process parts if they exist
        if (contract.parts && contract.parts.length > 0) {
          for (const part of contract.parts) {
            // Create or merge Part node
            await session.run(
              `
              MERGE (p:Part {part_id: $part_id, module_id: $module_id})
              SET p.type = $type
              RETURN p
              `,
              {
                part_id: part.id,
                module_id: contract.id,
                type: part.type,
              },
            );

            // Create MODULE_PART relationship
            await session.run(
              `
              MATCH (m:Module {module_id: $module_id})
              MATCH (p:Part {part_id: $part_id, module_id: $module_id})
              MERGE (m)-[r:MODULE_PART]->(p)
              RETURN r
              `,
              {
                module_id: contract.id,
                part_id: part.id,
              },
            );

            totalPartsProcessed++;
          }

          this.logger.log(
            `Created/updated ${contract.parts.length} parts for module: ${contract.id}`,
          );
        }

        // Process dependencies if they exist
        if (contract.dependencies && contract.dependencies.length > 0) {
          for (const dependency of contract.dependencies) {
            // Create MODULE_DEPENDENCY relationship with properties
            await session.run(
              `
              MATCH (m:Module {module_id: $from_module_id})
              MATCH (d:Module {module_id: $to_module_id})
              MERGE (m)-[r:MODULE_DEPENDENCY {module_id: $to_module_id}]->(d)
              SET r.parts = $parts
              RETURN r
              `,
              {
                from_module_id: contract.id,
                to_module_id: dependency.module_id,
                parts: JSON.stringify(dependency.parts),
              },
            );
          }

          this.logger.log(
            `Created/updated ${contract.dependencies.length} dependencies for module: ${contract.id}`,
          );
        }
      }

      this.logger.log(
        `Successfully applied ${totalModulesProcessed} modules and ${totalPartsProcessed} parts to Neo4j`,
      );

      return {
        success: true,
        modulesProcessed: totalModulesProcessed,
        partsProcessed: totalPartsProcessed,
        message: `Successfully applied ${totalModulesProcessed} modules and ${totalPartsProcessed} parts to Neo4j`,
      };
    } catch (error) {
      this.logger.error("Error applying contracts to Neo4j:", error.message);
      return {
        success: false,
        modulesProcessed: 0,
        partsProcessed: 0,
        message: `Failed to apply contracts to Neo4j: ${error.message}`,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Check if contract files have been modified by comparing their current hashes
   * with the hashes stored in Neo4j database
   * @returns Object with information about modified, added, and removed contracts
   */
  async checkIfContractsModified(): Promise<CheckModifiedResponseDto> {
    const session = this.neo4jService.getSession();

    try {
      // Get all current contract files with their calculated hashes
      const currentContracts = await this.getAllContracts();

      // Query Neo4j to get all stored module hashes
      const result = await session.run(
        `
        MATCH (m:Module)
        RETURN m.module_id AS moduleId, m.contractFileHash AS storedHash
        `,
      );

      // Build a map of stored hashes keyed by module_id
      const storedHashes = new Map<string, string>();
      result.records.forEach((record) => {
        const moduleId = record.get("moduleId");
        const storedHash = record.get("storedHash");
        if (moduleId && storedHash) {
          storedHashes.set(moduleId, storedHash);
        }
      });

      const changes: ModifiedContractDto[] = [];

      // Check for modified and added contracts
      for (const contract of currentContracts) {
        const moduleId = contract.content.id;
        const currentHash = contract.fileHash;
        const storedHash = storedHashes.get(moduleId);

        if (!storedHash) {
          // Contract is new (added)
          changes.push({
            moduleId,
            fileName: contract.fileName,
            filePath: contract.filePath,
            currentHash,
            storedHash: null,
            status: "added",
          });
        } else if (storedHash !== currentHash) {
          // Contract has been modified
          changes.push({
            moduleId,
            fileName: contract.fileName,
            filePath: contract.filePath,
            currentHash,
            storedHash,
            status: "modified",
          });
        }

        // Mark this module as seen
        storedHashes.delete(moduleId);
      }

      // Any remaining modules in storedHashes are removed contracts
      for (const [moduleId, storedHash] of storedHashes.entries()) {
        changes.push({
          moduleId,
          fileName: "unknown",
          filePath: "unknown",
          currentHash: "",
          storedHash,
          status: "removed",
        });
      }

      // Calculate statistics
      const modifiedCount = changes.filter((c) => c.status === "modified").length;
      const addedCount = changes.filter((c) => c.status === "added").length;
      const removedCount = changes.filter((c) => c.status === "removed").length;

      this.logger.log(
        `Contract changes detected: ${modifiedCount} modified, ${addedCount} added, ${removedCount} removed`,
      );

      return {
        hasChanges: changes.length > 0,
        totalChanges: changes.length,
        modifiedCount,
        addedCount,
        removedCount,
        changes,
      };
    } catch (error) {
      this.logger.error("Error checking contract modifications:", error.message);
      throw new Error(`Failed to check contract modifications: ${error.message}`);
    } finally {
      await session.close();
    }
  }
}
