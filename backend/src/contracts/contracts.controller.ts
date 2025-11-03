import {
  Controller,
  Get,
  Post,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ContractsService } from "./contracts.service";
import { ContractFileDto } from "./dto/contract-response.dto";
import { ValidationResponseDto } from "./dto/validation-response.dto";
import { ApplyResponseDto } from "./dto/apply-response.dto";

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
}
