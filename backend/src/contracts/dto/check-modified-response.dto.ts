import { ApiProperty } from "@nestjs/swagger";

export class ModifiedContractDto {
  @ApiProperty({
    description: "The module ID from the contract",
    example: "users-get",
  })
  moduleId: string;

  @ApiProperty({
    description: "The name of the contract file",
    example: "users-get.yml",
  })
  fileName: string;

  @ApiProperty({
    description: "The full path to the contract file",
    example: "/contracts/users-get.yml",
  })
  filePath: string;

  @ApiProperty({
    description: "The current hash of the contract file",
    example: "a3d2f1e8b9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1",
  })
  currentHash: string;

  @ApiProperty({
    description: "The stored hash from Neo4j database (null if contract is new)",
    example: "b4e3d2c1b0a9f8e7d6c5b4a3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3",
    required: false,
    nullable: true,
  })
  storedHash?: string | null;

  @ApiProperty({
    description: "The status of the contract: 'modified', 'added', or 'removed'",
    example: "modified",
    enum: ["modified", "added", "removed"],
  })
  status: "modified" | "added" | "removed";
}

export class CheckModifiedResponseDto {
  @ApiProperty({
    description: "Whether any contracts have been modified, added, or removed",
    example: true,
  })
  hasChanges: boolean;

  @ApiProperty({
    description: "Total number of contracts that have changed",
    example: 3,
  })
  totalChanges: number;

  @ApiProperty({
    description: "Number of modified contracts",
    example: 2,
  })
  modifiedCount: number;

  @ApiProperty({
    description: "Number of newly added contracts",
    example: 1,
  })
  addedCount: number;

  @ApiProperty({
    description: "Number of removed contracts",
    example: 0,
  })
  removedCount: number;

  @ApiProperty({
    description: "List of contracts that have been modified, added, or removed",
    type: [ModifiedContractDto],
  })
  changes: ModifiedContractDto[];
}
