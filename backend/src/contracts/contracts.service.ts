import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { glob } from "glob";

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
}
