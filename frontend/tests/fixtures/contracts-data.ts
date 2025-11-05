/**
 * Test fixtures for contract data
 * Provides reusable mock data for tests
 */

export const mockContracts = {
  // Sample valid contracts
  validContracts: [
    {
      fileName: 'example-contract.yml',
      filePath: '/contracts/example-contract.yml',
      content: {
        id: 'users-get',
        type: 'controller',
        category: 'api',
        description: 'Users get endpoint',
      },
    },
    {
      fileName: 'example-dependency.yml',
      filePath: '/contracts/example-dependency.yml',
      content: {
        id: 'users-permissions',
        type: 'service',
        category: 'service',
        description: 'Users permissions service',
      },
    },
  ],

  // Single contract
  singleContract: {
    fileName: 'single-contract.yml',
    filePath: '/contracts/single-contract.yml',
    content: {
      id: 'payment-service',
      type: 'service',
      category: 'backend',
      description: 'Payment processing service',
    },
  },

  // Multiple contracts with same type
  serviceContracts: [
    {
      fileName: 'service-a.yml',
      filePath: '/contracts/service-a.yml',
      content: {
        id: 'service-a',
        type: 'service',
        category: 'backend',
        description: 'Service A',
      },
    },
    {
      fileName: 'service-b.yml',
      filePath: '/contracts/service-b.yml',
      content: {
        id: 'service-b',
        type: 'service',
        category: 'backend',
        description: 'Service B',
      },
    },
    {
      fileName: 'service-c.yml',
      filePath: '/contracts/service-c.yml',
      content: {
        id: 'service-c',
        type: 'service',
        category: 'backend',
        description: 'Service C',
      },
    },
  ],

  // Contracts with different categories
  mixedCategoryContracts: [
    {
      fileName: 'api-controller.yml',
      filePath: '/contracts/api-controller.yml',
      content: {
        id: 'users-controller',
        type: 'controller',
        category: 'api',
        description: 'Users API controller',
      },
    },
    {
      fileName: 'business-service.yml',
      filePath: '/contracts/business-service.yml',
      content: {
        id: 'users-service',
        type: 'service',
        category: 'service',
        description: 'Users business service',
      },
    },
    {
      fileName: 'ui-component.yml',
      filePath: '/contracts/ui-component.yml',
      content: {
        id: 'users-table',
        type: 'component',
        category: 'frontend',
        description: 'Users table component',
      },
    },
  ],

  // Empty contracts array
  emptyContracts: [],
};

export const mockApiResponses = {
  // Successful response with contracts
  success: (contracts: any[]) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(contracts),
  }),

  // Empty response
  empty: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([]),
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
    body: JSON.stringify({ message: 'Not found' }),
  },

  // Bad request
  badRequest: {
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Bad request' }),
  },
};

/**
 * Mock data for check-if-contract-modified endpoint
 */
export const mockCheckModified = {
  // Has changes
  hasChanges: {
    hasChanges: true,
    totalChanges: 2,
    modifiedCount: 1,
    addedCount: 1,
    removedCount: 0,
    changes: [
      {
        moduleId: 'users-get',
        fileName: 'example-contract.yml',
        filePath: '/contracts/example-contract.yml',
        currentHash: 'a3d2f1e8b9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1',
        storedHash: 'b4e3d2c1b0a9f8e7d6c5b4a3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3',
        status: 'modified',
      },
      {
        moduleId: 'users-permissions',
        fileName: 'example-dependency.yml',
        filePath: '/contracts/example-dependency.yml',
        currentHash: 'c5f4e3d2c1b0a9f8e7d6c5b4a3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4',
        storedHash: null,
        status: 'added',
      },
    ],
  },

  // No changes
  noChanges: {
    hasChanges: false,
    totalChanges: 0,
    modifiedCount: 0,
    addedCount: 0,
    removedCount: 0,
    changes: [],
  },
};

export const mockCheckModifiedApiResponses = {
  // Successful response with changes
  hasChanges: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockCheckModified.hasChanges),
  },

  // Successful response with no changes
  noChanges: {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockCheckModified.noChanges),
  },

  // Server error
  serverError: {
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Failed to check contract modifications' }),
  },
};
