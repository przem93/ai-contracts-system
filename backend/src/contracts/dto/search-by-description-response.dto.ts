import { ApiProperty } from "@nestjs/swagger";
import { Contract } from "../contract.schema";

/**
 * DTO for a single module search result
 * Includes full contract information plus similarity score
 */
export class ModuleSearchResultDto {
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
    description:
      "Array of module search results ordered by similarity (highest first)",
    type: [ModuleSearchResultDto],
  })
  results: ModuleSearchResultDto[];
}
