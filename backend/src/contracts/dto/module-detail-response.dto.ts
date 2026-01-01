import { ApiProperty } from "@nestjs/swagger";

export class ModulePartDto {
  @ApiProperty({
    description: "Part identifier",
    example: "getUserById",
  })
  id: string;

  @ApiProperty({
    description: "Part type",
    example: "function",
  })
  type: string;
}

export class ModuleDetailResponseDto {
  @ApiProperty({
    description: "Module identifier",
    example: "users-service",
  })
  id: string;

  @ApiProperty({
    description: "Module type",
    example: "service",
  })
  type: string;

  @ApiProperty({
    description: "Module description",
    example: "Service for managing user data",
  })
  description: string;

  @ApiProperty({
    description: "Module category",
    example: "backend",
  })
  category: string;

  @ApiProperty({
    description: "Module parts - exportable components",
    type: [ModulePartDto],
  })
  parts: ModulePartDto[];
}
