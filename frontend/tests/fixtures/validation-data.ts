/**
 * Test fixtures for validation data
 * Provides reusable mock data for validation tests
 */

import { ValidationResponseDto, ValidationFileDto, ValidationErrorDto } from '../../src/api/generated/model';

/**
 * Mock validation errors
 */
export const mockValidationErrors = {
  missingId: {
    path: 'id',
    message: 'Contract must have an id',
  } as ValidationErrorDto,
  
  missingType: {
    path: 'type',
    message: 'Contract must have a type',
  } as ValidationErrorDto,
  
  missingCategory: {
    path: 'category',
    message: 'Contract must have a category',
  } as ValidationErrorDto,
  
  missingDescription: {
    path: 'description',
    message: 'Contract must have a description',
  } as ValidationErrorDto,
  
  typeMismatch: {
    path: 'dependencies[0].parts[0].type',
    message: 'Part type mismatch: expected "string" but got "number"',
  } as ValidationErrorDto,
  
  missingDependency: {
    path: 'dependencies[0].module_id',
    message: 'Referenced module "unknown-module" does not exist',
  } as ValidationErrorDto,
  
  partWithoutId: {
    path: 'parts[0].id',
    message: 'Part must have an id',
  } as ValidationErrorDto,
  
  partWithoutType: {
    path: 'parts[0].type',
    message: 'Part must have a type',
  } as ValidationErrorDto,
  
  emptyParts: {
    path: 'dependencies[0].parts',
    message: 'Dependency parts array cannot be empty',
  } as ValidationErrorDto,
};

/**
 * Mock validation files
 */
export const mockValidationFiles = {
  // Valid contract file
  validContract: {
    fileName: 'valid-contract.yml',
    filePath: '/contracts/valid-contract.yml',
    valid: true,
    errors: [],
  } as ValidationFileDto,
  
  // Another valid contract file
  validDependency: {
    fileName: 'valid-dependency.yml',
    filePath: '/contracts/valid-dependency.yml',
    valid: true,
    errors: [],
  } as ValidationFileDto,
  
  // Invalid contract - missing required fields
  invalidMissingId: {
    fileName: 'invalid-missing-id.yml',
    filePath: '/contracts/invalid-missing-id.yml',
    valid: false,
    errors: [mockValidationErrors.missingId],
  } as ValidationFileDto,
  
  // Invalid contract - type mismatch
  invalidTypeMismatch: {
    fileName: 'invalid-type-mismatch.yml',
    filePath: '/contracts/invalid-type-mismatch.yml',
    valid: false,
    errors: [mockValidationErrors.typeMismatch],
  } as ValidationFileDto,
  
  // Invalid contract - missing dependency
  invalidMissingDependency: {
    fileName: 'invalid-missing-dependency.yml',
    filePath: '/contracts/invalid-missing-dependency.yml',
    valid: false,
    errors: [mockValidationErrors.missingDependency],
  } as ValidationFileDto,
  
  // Invalid contract - multiple errors
  invalidMultipleErrors: {
    fileName: 'invalid-multiple-errors.yml',
    filePath: '/contracts/invalid-multiple-errors.yml',
    valid: false,
    errors: [
      mockValidationErrors.missingType,
      mockValidationErrors.missingCategory,
      mockValidationErrors.missingDescription,
    ],
  } as ValidationFileDto,
  
  // Invalid contract - part validation errors
  invalidPartErrors: {
    fileName: 'invalid-part-errors.yml',
    filePath: '/contracts/invalid-part-errors.yml',
    valid: false,
    errors: [
      mockValidationErrors.partWithoutId,
      mockValidationErrors.partWithoutType,
    ],
  } as ValidationFileDto,
};

/**
 * Mock validation responses
 */
export const mockValidationResponses = {
  // All contracts valid
  allValid: {
    valid: true,
    files: [
      mockValidationFiles.validContract,
      mockValidationFiles.validDependency,
    ],
  } as ValidationResponseDto,
  
  // Some contracts invalid
  someInvalid: {
    valid: false,
    files: [
      mockValidationFiles.validContract,
      mockValidationFiles.invalidTypeMismatch,
      mockValidationFiles.invalidMissingDependency,
    ],
  } as ValidationResponseDto,
  
  // All contracts invalid
  allInvalid: {
    valid: false,
    files: [
      mockValidationFiles.invalidMissingId,
      mockValidationFiles.invalidTypeMismatch,
      mockValidationFiles.invalidMultipleErrors,
    ],
  } as ValidationResponseDto,
  
  // Single valid contract
  singleValid: {
    valid: true,
    files: [mockValidationFiles.validContract],
  } as ValidationResponseDto,
  
  // Single invalid contract
  singleInvalid: {
    valid: false,
    files: [mockValidationFiles.invalidTypeMismatch],
  } as ValidationResponseDto,
  
  // Multiple invalid contracts with different error types
  mixedErrors: {
    valid: false,
    files: [
      mockValidationFiles.validContract,
      mockValidationFiles.invalidMissingId,
      mockValidationFiles.validDependency,
      mockValidationFiles.invalidMultipleErrors,
      mockValidationFiles.invalidPartErrors,
    ],
  } as ValidationResponseDto,
  
  // No files to validate
  noFiles: {
    valid: true,
    files: [],
  } as ValidationResponseDto,
};

/**
 * Mock API responses for validation endpoint
 */
export const mockValidationApiResponses = {
  // Successful response with all valid contracts
  successAllValid: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockValidationResponses.allValid),
  },
  
  // Successful response with some invalid contracts
  successSomeInvalid: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockValidationResponses.someInvalid),
  },
  
  // Successful response with all invalid contracts
  successAllInvalid: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockValidationResponses.allInvalid),
  },
  
  // Successful response with single valid contract
  successSingleValid: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockValidationResponses.singleValid),
  },
  
  // Successful response with single invalid contract
  successSingleInvalid: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockValidationResponses.singleInvalid),
  },
  
  // Successful response with mixed errors
  successMixedErrors: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockValidationResponses.mixedErrors),
  },
  
  // Successful response with no files
  successNoFiles: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockValidationResponses.noFiles),
  },
  
  // Server error
  serverError: {
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Internal server error' }),
  },
  
  // Not found error
  notFound: {
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Validation endpoint not found' }),
  },
  
  // Bad request
  badRequest: {
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Bad request' }),
  },
};
