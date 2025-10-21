import { ApiProperty } from "@nestjs/swagger";
import { Contract } from "../contract.schema";

/**
 * DTO for contract file response
 */
export class ContractFileDto {
  @ApiProperty({
    description: "The name of the contract file",
    example: "example-contract.yml",
  })
  fileName: string;

  @ApiProperty({
    description: "The full path to the contract file",
    example: "/contracts/example-contract.yml",
  })
  filePath: string;

  @ApiProperty({
    description: "The parsed contract content",
    type: "object",
  })
  content: Contract;
}

/**
 * DTO for the list of all contracts response
 */
export class GetAllContractsResponseDto {
  @ApiProperty({
    description: "Array of contract files with their parsed content",
    type: [ContractFileDto],
  })
  contracts: ContractFileDto[];
}
