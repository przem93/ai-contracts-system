import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for contract categories response
 */
export class CategoriesResponseDto {
  @ApiProperty({
    description: "Array of unique contract category names",
    example: ["api", "service", "frontend"],
    type: [String],
  })
  categories: string[];
}
