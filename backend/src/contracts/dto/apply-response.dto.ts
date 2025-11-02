import { ApiProperty } from "@nestjs/swagger";

export class ApplyResponseDto {
  @ApiProperty({
    description: "Whether the operation was successful",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Number of modules processed",
    example: 5,
  })
  modulesProcessed: number;

  @ApiProperty({
    description: "Number of parts processed",
    example: 12,
  })
  partsProcessed: number;

  @ApiProperty({
    description: "Success or error message",
    example: "Successfully applied 5 modules and 12 parts to Neo4j",
  })
  message: string;
}
