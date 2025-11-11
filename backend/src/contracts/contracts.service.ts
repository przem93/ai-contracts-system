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
import {
  ModuleRelationsResponseDto,
  OutgoingDependencyDto,
  IncomingDependencyDto,
  DependencyPartDto,
} from "./dto/module-relations-response.dto";

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

  /**
   * Parse contracts and collect metadata for validation
   * First pass: Parse all contracts and collect their IDs and parts
   */
  private parseContractsAndCollectMetadata(
    files: string[],
  ): {
    parsedContracts: Array<{
      file: string;
      fileName: string;
      contract: any;
    }>;
    availableModuleIds: Set<string>;
    moduleIdToFiles: Map<string, string[]>;
    moduleParts: Map<string, Array<{ id: string; type: string }>>;
    parseErrors: Array<{
      filePath: string;
      fileName: string;
      valid: boolean;
      errors?: Array<{ path: string; message: string }>;
    }>;
  } {
    const parsedContracts: Array<{
      file: string;
      fileName: string;
      contract: any;
    }> = [];
    const availableModuleIds = new Set<string>();
    const moduleIdToFiles: Map<string, string[]> = new Map();
    const moduleParts: Map<
      string,
      Array<{ id: string; type: string }>
    > = new Map();
    const parseErrors: Array<{
      filePath: string;
      fileName: string;
      valid: boolean;
      errors: Array<{ path: string; message: string }>;
    }> = [];

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

          // Track which files use each module ID for duplicate detection
          if (!moduleIdToFiles.has(parsedContract.id)) {
            moduleIdToFiles.set(parsedContract.id, []);
          }
          moduleIdToFiles.get(parsedContract.id)!.push(fileName);

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
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        parseErrors.push({
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
      parsedContracts,
      availableModuleIds,
      moduleIdToFiles,
      moduleParts,
      parseErrors,
    };
  }

  /**
   * Validate contract against schema
   */
  private validateSchema(contract: any): Array<{ path: string; message: string }> {
    const validationResult = ContractSchema.safeParse(contract);
    const errors: Array<{ path: string; message: string }> = [];

    if (!validationResult.success) {
      errors.push(
        ...validationResult.error.issues.map((err) => ({
          path: err.path.join(".") || "root",
          message: err.message,
        })),
      );
    }

    return errors;
  }

  /**
   * Validate for duplicate module IDs across different files
   */
  private validateDuplicateModuleIds(
    contract: any,
    fileName: string,
    moduleIdToFiles: Map<string, string[]>,
  ): Array<{ path: string; message: string }> {
    const errors: Array<{ path: string; message: string }> = [];

    if (contract.id && moduleIdToFiles.has(contract.id)) {
      const filesWithSameId = moduleIdToFiles.get(contract.id)!;
      if (filesWithSameId.length > 1) {
        const otherFiles = filesWithSameId
          .filter((f) => f !== fileName)
          .join(", ");
        errors.push({
          path: "id",
          message: `Duplicate module id "${contract.id}" found in files: ${otherFiles}`,
        });
      }
    }

    return errors;
  }

  /**
   * Validate for duplicate module_id in dependencies array
   */
  private validateDuplicateDependencies(
    contract: any,
  ): Array<{ path: string; message: string }> {
    const errors: Array<{ path: string; message: string }> = [];

    if (contract.dependencies) {
      const seenModuleIds = new Set<string>();
      const duplicateModuleIds = new Set<string>();

      for (let i = 0; i < contract.dependencies.length; i++) {
        const dep = contract.dependencies[i];
        if (seenModuleIds.has(dep.module_id)) {
          duplicateModuleIds.add(dep.module_id);
        } else {
          seenModuleIds.add(dep.module_id);
        }
      }

      // Add errors for all dependencies with duplicate module_ids
      if (duplicateModuleIds.size > 0) {
        for (let i = 0; i < contract.dependencies.length; i++) {
          const dep = contract.dependencies[i];
          if (duplicateModuleIds.has(dep.module_id)) {
            errors.push({
              path: `dependencies.${i}.module_id`,
              message: `Duplicate dependency on module "${dep.module_id}". Each module should be listed only once in dependencies`,
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate for self-dependency (module depending on itself)
   */
  private validateSelfDependencies(
    contract: any,
  ): Array<{ path: string; message: string }> {
    const errors: Array<{ path: string; message: string }> = [];

    if (contract.dependencies && contract.id) {
      for (let i = 0; i < contract.dependencies.length; i++) {
        const dep = contract.dependencies[i];
        if (dep.module_id === contract.id) {
          errors.push({
            path: `dependencies.${i}.module_id`,
            message: `Module "${contract.id}" cannot depend on itself. Self-dependencies are not allowed`,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate for duplicate part_id within each dependency's parts array
   */
  private validateDuplicatePartsInDependencies(
    contract: any,
  ): Array<{ path: string; message: string }> {
    const errors: Array<{ path: string; message: string }> = [];

    if (contract.dependencies) {
      for (let i = 0; i < contract.dependencies.length; i++) {
        const dep = contract.dependencies[i];
        if (dep.parts && Array.isArray(dep.parts)) {
          const seenPartIds = new Set<string>();
          const duplicatePartIds = new Set<string>();

          for (let j = 0; j < dep.parts.length; j++) {
            const part = dep.parts[j];
            if (seenPartIds.has(part.part_id)) {
              duplicatePartIds.add(part.part_id);
            } else {
              seenPartIds.add(part.part_id);
            }
          }

          // Add errors for all parts with duplicate part_ids
          if (duplicatePartIds.size > 0) {
            for (let j = 0; j < dep.parts.length; j++) {
              const part = dep.parts[j];
              if (duplicatePartIds.has(part.part_id)) {
                errors.push({
                  path: `dependencies.${i}.parts.${j}.part_id`,
                  message: `Duplicate part_id "${part.part_id}" in dependency on module "${dep.module_id}". Each part should be referenced only once per dependency`,
                });
              }
            }
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate cross-contract references (module existence and part type matching)
   */
  private validateCrossContractReferences(
    contract: any,
    availableModuleIds: Set<string>,
    moduleParts: Map<string, Array<{ id: string; type: string }>>,
  ): Array<{ path: string; message: string }> {
    const errors: Array<{ path: string; message: string }> = [];

    if (contract.dependencies) {
      for (let i = 0; i < contract.dependencies.length; i++) {
        const dep = contract.dependencies[i];
        if (!availableModuleIds.has(dep.module_id)) {
          errors.push({
            path: `dependencies.${i}.module_id`,
            message: `Referenced module "${dep.module_id}" does not exist`,
          });
        } else {
          // Validate dependency part types and existence
          const referencedParts = moduleParts.get(dep.module_id);
          if (dep.parts && Array.isArray(dep.parts)) {
            for (let j = 0; j < dep.parts.length; j++) {
              const depPart = dep.parts[j];
              if (referencedParts) {
                const matchingPart = referencedParts.find(
                  (p) => p.id === depPart.part_id,
                );
                if (!matchingPart) {
                  // Part ID doesn't exist in the referenced module
                  errors.push({
                    path: `dependencies.${i}.parts.${j}.part_id`,
                    message: `Part "${depPart.part_id}" does not exist in module "${dep.module_id}"`,
                  });
                } else if (matchingPart.type !== depPart.type) {
                  // Part exists but type doesn't match
                  errors.push({
                    path: `dependencies.${i}.parts.${j}.type`,
                    message: `Part type mismatch for "${depPart.part_id}": expected "${matchingPart.type}" but got "${depPart.type}"`,
                  });
                }
              }
            }
          }
        }
      }
    }

    return errors;
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

      // Step 1: Parse all contracts and collect metadata
      const {
        parsedContracts,
        availableModuleIds,
        moduleIdToFiles,
        moduleParts,
        parseErrors,
      } = this.parseContractsAndCollectMetadata(files);

      const validationResults = [...parseErrors];
      let allValid = parseErrors.length === 0;

      // Step 2: Validate each contract with all validation rules
      for (const { file, fileName, contract } of parsedContracts) {
        const errors: Array<{ path: string; message: string }> = [];

        // Validate the parsed contract against the schema
        const schemaValidation = ContractSchema.safeParse(contract);
        const isSchemaValid = schemaValidation.success;

        // Step 2a: Schema validation
        errors.push(...this.validateSchema(contract));

        // Step 2b-2f: Run additional validations only if schema is valid
        if (isSchemaValid) {
          // Step 2b: Check for duplicate module IDs
          errors.push(
            ...this.validateDuplicateModuleIds(
              contract,
              fileName,
              moduleIdToFiles,
            ),
          );

          // Step 2c: Check for duplicate dependencies
          errors.push(...this.validateDuplicateDependencies(contract));

          // Step 2d: Check for self-dependencies
          errors.push(...this.validateSelfDependencies(contract));

          // Step 2e: Check for duplicate parts in dependencies
          errors.push(...this.validateDuplicatePartsInDependencies(contract));

          // Step 2f: Check cross-contract references
          errors.push(
            ...this.validateCrossContractReferences(
              contract,
              availableModuleIds,
              moduleParts,
            ),
          );
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
      // Ensure uniqueness constraint exists on Module.module_id
      await session.run(`
        CREATE CONSTRAINT module_id_unique IF NOT EXISTS
        FOR (m:Module) REQUIRE m.module_id IS UNIQUE
      `);

      // Execute all operations in a single write transaction for atomicity
      const result = await session.executeWrite(async (tx) => {
        // Clear all existing data from the database (reset)
        this.logger.log("Clearing all existing data from Neo4j database...");
        await tx.run("MATCH (n) DETACH DELETE n");
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
          await tx.run(
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
              await tx.run(
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
              await tx.run(
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
              // Note: Removed redundant module_id property from relationship pattern
              await tx.run(
                `
                MATCH (m:Module {module_id: $from_module_id})
                MATCH (d:Module {module_id: $to_module_id})
                MERGE (m)-[r:MODULE_DEPENDENCY]->(d)
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
          totalModulesProcessed,
          totalPartsProcessed,
        };
      });

      return {
        success: true,
        modulesProcessed: result.totalModulesProcessed,
        partsProcessed: result.totalPartsProcessed,
        message: `Successfully applied ${result.totalModulesProcessed} modules and ${result.totalPartsProcessed} parts to Neo4j`,
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

  /**
   * Get relations for a specific module
   * Returns outgoing dependencies (modules this module depends on)
   * and incoming dependencies (modules that depend on this module)
   * @param moduleId The module ID to get relations for
   * @returns Object with module relations
   */
  async getModuleRelations(
    moduleId: string,
  ): Promise<ModuleRelationsResponseDto> {
    const session = this.neo4jService.getSession();

    try {
      // Check if module exists
      const moduleCheckResult = await session.run(
        `
        MATCH (m:Module {module_id: $moduleId})
        RETURN m
        `,
        { moduleId },
      );

      if (moduleCheckResult.records.length === 0) {
        throw new Error(`Module with id "${moduleId}" not found`);
      }

      // Query outgoing dependencies (modules this module depends on)
      const outgoingResult = await session.run(
        `
        MATCH (m:Module {module_id: $moduleId})-[r:MODULE_DEPENDENCY]->(dep:Module)
        RETURN dep.module_id AS module_id, r.parts AS parts
        `,
        { moduleId },
      );

      const outgoingDependencies: OutgoingDependencyDto[] =
        outgoingResult.records.map((record) => {
          const depModuleId = record.get("module_id");
          const partsJson = record.get("parts");
          const parts: DependencyPartDto[] = partsJson
            ? JSON.parse(partsJson)
            : [];

          return {
            module_id: depModuleId,
            parts,
          };
        });

      // Query incoming dependencies (modules that depend on this module)
      const incomingResult = await session.run(
        `
        MATCH (dependent:Module)-[r:MODULE_DEPENDENCY]->(m:Module {module_id: $moduleId})
        RETURN dependent.module_id AS module_id, r.parts AS parts
        `,
        { moduleId },
      );

      const incomingDependencies: IncomingDependencyDto[] =
        incomingResult.records.map((record) => {
          const depModuleId = record.get("module_id");
          const partsJson = record.get("parts");
          const parts: DependencyPartDto[] = partsJson
            ? JSON.parse(partsJson)
            : [];

          return {
            module_id: depModuleId,
            parts,
          };
        });

      this.logger.log(
        `Retrieved relations for module "${moduleId}": ${outgoingDependencies.length} outgoing, ${incomingDependencies.length} incoming`,
      );

      return {
        module_id: moduleId,
        outgoing_dependencies: outgoingDependencies,
        incoming_dependencies: incomingDependencies,
      };
    } catch (error) {
      this.logger.error(
        `Error getting module relations for "${moduleId}":`,
        error.message,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
