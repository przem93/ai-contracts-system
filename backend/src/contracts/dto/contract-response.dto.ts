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

  @ApiProperty({
    description: "SHA256 hash of the contract file content",
    example: "a3d2f1e8b9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1",
  })
  fileHash: string;
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
