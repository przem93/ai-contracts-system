import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for a single module search result
 */
export class ModuleSearchResultDto {
  @ApiProperty({
    description: "The module ID",
    example: "users-service",
  })
  module_id: string;

  @ApiProperty({
    description: "The module type",
    example: "service",
  })
  type: string;

  @ApiProperty({
    description: "The module description",
    example: "Service for managing user data and authentication",
  })
  description: string;

  @ApiProperty({
    description: "The module category",
    example: "backend",
  })
  category: string;

  @ApiProperty({
    description: "Similarity score (0-1, where 1 is most similar)",
    example: 0.85,
  })
  similarity: number;
}

/**
 * DTO for search by description response
 */
export class SearchByDescriptionResponseDto {
  @ApiProperty({
    description: "The search query that was used",
    example: "authentication service",
  })
  query: string;

  @ApiProperty({
    description: "Number of results returned",
    example: 5,
  })
  resultsCount: number;

  @ApiProperty({
    description: "Array of module search results ordered by similarity (highest first)",
    type: [ModuleSearchResultDto],
  })
  results: ModuleSearchResultDto[];
}
