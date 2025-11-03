/**
 * Test fixtures for apply changes data
 * Provides reusable mock data for apply tests
 */

import { ApplyResponseDto } from '../../src/api/generated/model';

/**
 * Mock apply responses
 */
export const mockApplyResponses = {
  // Successful apply with typical numbers
  success: {
    success: true,
    modulesProcessed: 5,
    partsProcessed: 12,
    message: 'Successfully applied 5 modules and 12 parts to Neo4j',
  } as ApplyResponseDto,
  
  // Successful apply with single module
  successSingleModule: {
    success: true,
    modulesProcessed: 1,
    partsProcessed: 3,
    message: 'Successfully applied 1 module and 3 parts to Neo4j',
  } as ApplyResponseDto,
  
  // Successful apply with many modules
  successManyModules: {
    success: true,
    modulesProcessed: 25,
    partsProcessed: 87,
    message: 'Successfully applied 25 modules and 87 parts to Neo4j',
  } as ApplyResponseDto,
  
  // Successful apply with no modules (edge case)
  successNoModules: {
    success: true,
    modulesProcessed: 0,
    partsProcessed: 0,
    message: 'Successfully applied 0 modules and 0 parts to Neo4j',
  } as ApplyResponseDto,
};

/**
 * Mock API responses for apply endpoint
 */
export const mockApplyApiResponses = {
  // Successful apply response
  success: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockApplyResponses.success),
  },
  
  // Successful apply with single module
  successSingleModule: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockApplyResponses.successSingleModule),
  },
  
  // Successful apply with many modules
  successManyModules: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockApplyResponses.successManyModules),
  },
  
  // Validation failed before apply
  validationFailed: {
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ 
      message: 'Contract validation failed - invalid contracts detected',
      statusCode: 400,
      error: 'Bad Request',
    }),
  },
  
  // Database connection error
  databaseError: {
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ 
      message: 'Failed to apply contracts to database',
      statusCode: 500,
      error: 'Internal Server Error',
    }),
  },
  
  // Generic server error
  serverError: {
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ 
      message: 'Internal server error',
      statusCode: 500,
      error: 'Internal Server Error',
    }),
  },
  
  // Service unavailable
  serviceUnavailable: {
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ 
      message: 'Service temporarily unavailable',
      statusCode: 503,
      error: 'Service Unavailable',
    }),
  },
};
