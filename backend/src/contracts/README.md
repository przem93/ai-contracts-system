# Contracts Module

## Overview
The Contracts module provides functionality to parse and serve YAML contract files through a REST API endpoint.

## Features
- Parses YAML contract files from a configurable path
- Supports glob patterns for flexible file matching
- Returns parsed contracts with metadata (filename, path, content)
- Handles errors gracefully and logs parsing issues

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

## Dependencies
- `js-yaml`: YAML parsing library
- `glob`: File pattern matching
- `@nestjs/config`: Configuration management

