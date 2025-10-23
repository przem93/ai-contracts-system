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
