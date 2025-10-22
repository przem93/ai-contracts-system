# Contracts Module

## Overview
The Contracts module provides functionality to parse, validate, and serve YAML contract files through a REST API endpoint. It supports the frontend's three-step contract management workflow (Review → Verify → Apply).

## Features
- Parses YAML contract files from a configurable path
- Supports glob patterns for flexible file matching
- Returns parsed contracts with metadata (filename, path, content)
- Validates contract structure and dependencies
- Compares contracts with Neo4j database state to detect changes
- Handles errors gracefully and logs parsing issues
- Supports the frontend's three-step workflow:
  1. **Review**: Detect changes between YAML files and database
  2. **Verify**: Validate contract structure and dependencies
  3. **Apply**: Update Neo4j database with verified changes

## Configuration

### Environment Variable
Set the `CONTRACTS_PATH` environment variable to specify where contract files are located:

```bash
# Example: Parse all .yml files in the /contracts directory and subdirectories
CONTRACTS_PATH=/contracts/**/*.yml

# Example: Parse specific files
CONTRACTS_PATH=/path/to/contracts/*.yaml
```

## API Endpoints

### GET /contracts
Returns all parsed contract files.

**Response Example:**
```json
[
  {
    "fileName": "example-contract.yml",
    "filePath": "/full/path/to/example-contract.yml",
    "content": {
      "name": "example-service",
      "version": "1.0.0",
      "dependencies": [...],
      "endpoints": [...]
    }
  }
]
```

## Usage

The module is automatically imported in the main `AppModule` and the endpoint is available at:
```
GET http://localhost:3000/contracts
```

### Integration with Frontend Workflow

The Contracts module powers the frontend's three-step contract management workflow:

1. **Review Step**: Frontend calls `/contracts` to get all contracts and compares them with the current Neo4j database state to detect changes
2. **Verify Step**: Frontend sends contracts for validation to ensure they are well-formed and dependencies are consistent
3. **Apply Step**: Frontend requests to apply verified changes, which updates the Neo4j database

This ensures that contract changes are safely reviewed, validated, and applied with proper error handling at each step.

## Dependencies
- `js-yaml`: YAML parsing library
- `glob`: File pattern matching
- `@nestjs/config`: Configuration management

