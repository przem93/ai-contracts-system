import {
  Controller,
  Get,
  Post,
  BadRequestException,
  InternalServerErrorException,
  Param,
  NotFoundException,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ContractsService } from "./contracts.service";
import { ContractFileDto } from "./dto/contract-response.dto";
import { ValidationResponseDto } from "./dto/validation-response.dto";
import { ApplyResponseDto } from "./dto/apply-response.dto";
import { CheckModifiedResponseDto } from "./dto/check-modified-response.dto";
import { ModuleRelationsResponseDto } from "./dto/module-relations-response.dto";
import { SearchByDescriptionResponseDto } from "./dto/search-by-description-response.dto";
import { ContractTypesResponseDto } from "./dto/contract-types-response.dto";
import { CategoriesResponseDto } from "./dto/categories-response.dto";

@ApiTags("contracts")
@Controller("contracts")
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @ApiOperation({ summary: "Get all contracts" })
  @ApiResponse({
    status: 200,
    description: "Returns all contract files with their parsed content",
    type: [ContractFileDto],
  })
  async getAllContracts(): Promise<ContractFileDto[]> {
    return this.contractsService.getAllContracts();
  }

  @Get("types")
  @ApiOperation({ summary: "Get all unique contract types" })
  @ApiResponse({
    status: 200,
    description: "Returns all unique contract types found in the system",
    type: ContractTypesResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: "Failed to retrieve contract types",
  })
  async getContractTypes(): Promise<ContractTypesResponseDto> {
    try {
      return await this.contractsService.getContractTypes();
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to get contract types: ${error.message}`,
      );
    }
  }

  @Get("validate")
  @ApiOperation({ summary: "Validate all contracts" })
  @ApiResponse({
    status: 200,
    description: "Returns validation results for all contract files",
    type: ValidationResponseDto,
  })
  async validateContracts(): Promise<ValidationResponseDto> {
    return this.contractsService.validateContracts();
  }

  @Get("check-if-contract-modified")
  @ApiOperation({
    summary: "Check if contract files have been modified",
    description:
      "Compares current contract file hashes with stored hashes in Neo4j database to detect modifications, additions, and removals",
  })
  @ApiResponse({
    status: 200,
    description:
      "Returns information about modified, added, and removed contracts",
    type: CheckModifiedResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: "Failed to check contract modifications",
  })
  async checkIfContractsModified(): Promise<CheckModifiedResponseDto> {
    return this.contractsService.checkIfContractsModified();
  }

  @Post("apply")
  @ApiOperation({
    summary: "Apply contract changes to Neo4j database",
    description:
      "Validates all contracts first, then applies them to the Neo4j database if validation passes. Clears existing data before applying.",
  })
  @ApiResponse({
    status: 200,
    description: "Contracts successfully applied to database",
    type: ApplyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Contract validation failed - invalid contracts detected",
  })
  @ApiResponse({
    status: 500,
    description: "Failed to apply contracts to database",
  })
  async applyContracts(): Promise<ApplyResponseDto> {
    // Step 1: Validate contracts first
    const validationResult = await this.contractsService.validateContracts();

    // Step 2: If validation fails, throw BadRequestException with validation details
    if (!validationResult.valid) {
      throw new BadRequestException({
        message: "Contract validation failed. Cannot apply invalid contracts.",
        validation: validationResult,
      });
    }

    // Step 3: Get all contracts
    const contractFiles = await this.contractsService.getAllContracts();

    // Step 4: Apply contracts to Neo4j (with file hash)
    const applyResult =
      await this.contractsService.applyContractsToNeo4j(contractFiles);

    // Step 5: If apply failed, throw InternalServerErrorException
    if (!applyResult.success) {
      throw new InternalServerErrorException({
        message: "Failed to apply contracts to Neo4j database",
        details: applyResult.message,
      });
    }

    // Step 6: Return success result
    return applyResult;
  }

  @Get(":module_id/relations")
  @ApiOperation({
    summary: "Get relations for a specific module",
    description:
      "Returns outgoing dependencies (modules this module depends on) and incoming dependencies (modules that depend on this module) with the parts they use",
  })
  @ApiParam({
    name: "module_id",
    description: "The module ID to get relations for",
    example: "users-service",
  })
  @ApiResponse({
    status: 200,
    description: "Returns module relations",
    type: ModuleRelationsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Module not found",
  })
  async getModuleRelations(
    @Param("module_id") moduleId: string,
  ): Promise<ModuleRelationsResponseDto> {
    try {
      return await this.contractsService.getModuleRelations(moduleId);
    } catch (error) {
      if (error.message.includes("not found")) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get("search")
  @ApiOperation({
    summary: "Search and filter modules",
    description:
      "Search for modules using semantic similarity (when query is provided) and/or filter by type and category. If no parameters are provided, returns all modules from Neo4j.",
  })
  @ApiQuery({
    name: "query",
    description: "The search query text to find similar modules using semantic similarity",
    example: "user authentication service",
    required: false,
  })
  @ApiQuery({
    name: "limit",
    description: "Maximum number of results to return (default: 50)",
    example: 50,
    required: false,
  })
  @ApiQuery({
    name: "type",
    description: "Filter results by contract type (e.g., 'controller', 'service')",
    example: "service",
    required: false,
  })
  @ApiQuery({
    name: "category",
    description: "Filter results by contract category (e.g., 'api', 'backend')",
    example: "backend",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Returns search results ordered by similarity (if query provided) or by module_id",
    type: SearchByDescriptionResponseDto,
  })
  @ApiResponse({
    status: 500,
    description:
      "Failed to perform search (embedding service not ready or Neo4j error)",
  })
  async searchByDescription(
    @Query("query") query?: string,
    @Query("limit") limit?: string,
    @Query("type") type?: string,
    @Query("category") category?: string,
  ): Promise<SearchByDescriptionResponseDto> {
    const hasQuery = query && query.trim().length > 0;

    // Parse and validate limit parameter
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException("Limit must be a positive integer");
    }
    if (parsedLimit > 100) {
      throw new BadRequestException("Limit cannot exceed 100");
    }

    try {
      return await this.contractsService.searchByDescription(
        hasQuery ? query : undefined,
        parsedLimit,
        type,
        category,
      );
    } catch (error) {
      if (error.message.includes("Embedding service is not ready")) {
        throw new InternalServerErrorException(
          "Embedding service is not available. Please try again later.",
        );
      }
      throw new InternalServerErrorException(
        `Failed to search modules: ${error.message}`,
      );
    }
  }

  @Get("categories")
  @ApiOperation({
    summary: "Get all contract categories",
    description:
      "Returns a list of all unique contract category names from the Neo4j database",
  })
  @ApiResponse({
    status: 200,
    description: "Returns array of unique category names",
    type: CategoriesResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: "Failed to fetch categories",
  })
  async getCategories(): Promise<CategoriesResponseDto> {
    try {
      return await this.contractsService.getCategoriesList();
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch categories: ${error.message}`,
      );
    }
  }
}
