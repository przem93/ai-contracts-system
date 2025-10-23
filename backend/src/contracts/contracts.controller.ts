import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ContractsService } from "./contracts.service";
import { ContractFileDto } from "./dto/contract-response.dto";

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
  })
  async validateContracts() {
    return this.contractsService.validateContracts();
  }
}
