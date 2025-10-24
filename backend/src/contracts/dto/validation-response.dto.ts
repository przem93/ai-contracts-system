import { ApiProperty } from "@nestjs/swagger";

export class ValidationErrorDto {
  @ApiProperty({
    description: "The path to the field with the validation error",
    example: "dependencies.0.module_id",
  })
  path: string;

  @ApiProperty({
    description: "The validation error message",
    example: 'Referenced module "users-permissions" does not exist',
  })
  message: string;
}

export class ValidationFileDto {
  @ApiProperty({
    description: "The full path to the contract file",
    example: "/contracts/example-contract.yml",
  })
  filePath: string;

  @ApiProperty({
    description: "The name of the contract file",
    example: "example-contract.yml",
  })
  fileName: string;

  @ApiProperty({
    description: "Whether the contract file is valid",
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: "List of validation errors (only present if valid is false)",
    type: [ValidationErrorDto],
    required: false,
  })
  errors?: ValidationErrorDto[];
}

export class ValidationResponseDto {
  @ApiProperty({
    description: "Whether all contracts are valid",
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: "Validation results for each contract file",
    type: [ValidationFileDto],
  })
  files: ValidationFileDto[];
}
