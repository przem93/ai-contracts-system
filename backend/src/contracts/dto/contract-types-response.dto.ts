import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for contract types response
 */
export class ContractTypesResponseDto {
  @ApiProperty({
    description: "Array of unique contract types found in the system",
    example: ["controller", "service", "component"],
    type: [String],
  })
  types: string[];

  @ApiProperty({
    description: "Total count of unique contract types",
    example: 3,
  })
  count: number;
}
