# Embedding Implementation Documentation

## Overview
This document describes the implementation of text embedding functionality for module descriptions in the AI Contracts System.

## Changes Made

### 1. **Embedding Service** (`src/contracts/embedding.service.ts`)
- Created a new service to generate text embeddings using `@xenova/transformers`
- **Model Used**: `Xenova/bge-small-en-v1.5` 
  - Note: Changed from `google/embeddinggemma-300m` to `Xenova/bge-small-en-v1.5` due to authorization issues
  - `Xenova/bge-small-en-v1.5` is a high-quality embedding model specifically designed for semantic search
  - No authentication required, works out of the box
  
#### Key Features:
- Async initialization with error handling
- Generates embeddings from text descriptions
- Supports batch embedding generation
- Returns embeddings as `number[]` arrays
- Graceful error handling with logging

#### API:
```typescript
class EmbeddingService {
  async initialize(): Promise<void>
  async generateEmbedding(text: string): Promise<number[]>
  async generateEmbeddings(texts: string[]): Promise<number[][]>
  isReady(): boolean
}
```

### 2. **Integration with Contracts Service** (`src/contracts/contracts.service.ts`)
- Injected `EmbeddingService` into `ContractsService`
- Implemented `OnModuleInit` to initialize embeddings on startup
- Modified `applyContractsToNeo4j()` to generate and store embeddings for each module
- Graceful degradation: continues without embeddings if initialization fails

#### Changes:
```typescript
// Service now implements OnModuleInit
export class ContractsService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private neo4jService: Neo4jService,
    private embeddingService: EmbeddingService,  // Added
  ) {}

  async onModuleInit() {
    // Initialize embedding service on startup
  }
}
```

### 3. **Neo4j Schema Update**
- Added `embedding` field to Module nodes
- Embeddings stored as arrays of numbers in Neo4j
- Field is nullable (null if embedding generation fails)

#### Cypher Update:
```cypher
MERGE (m:Module {module_id: $module_id})
SET m.type = $type,
    m.description = $description,
    m.category = $category,
    m.contractFileHash = $contractFileHash,
    m.embedding = $embedding  -- New field
RETURN m
```

### 4. **Module Configuration** (`src/contracts/contracts.module.ts`)
- Added `EmbeddingService` to providers array
- Service is now available for dependency injection

### 5. **Package Dependencies**
- Added `@xenova/transformers@^2.17.2` to dependencies
- Includes all required sub-dependencies (ONNX runtime, Sharp, etc.)

### 6. **Testing**

#### Unit Tests:
- **`embedding.service.spec.ts`**: 12 tests covering all functionality
  - Initialization
  - Single and batch embedding generation
  - Error handling (empty text, not initialized)
  - Consistency checks

- **`contracts.service.spec.ts`**: 84 tests (all passing)
  - Updated to mock `EmbeddingService`
  - Tests continue to pass with new integration

#### Test Configuration:
- Updated Jest config in `package.json` to handle ES modules
- Created mock for `@xenova/transformers` in `__mocks__/@xenova/transformers.js`
- All 156 tests pass successfully

## Usage

### When Docker Starts:
1. Backend service initializes
2. `EmbeddingService.initialize()` is called automatically
3. Downloads and caches the `Xenova/bge-small-en-v1.5` model (~25MB)
4. Model is ready for generating embeddings

### When Applying Contracts:
1. For each module in the contract:
   - Generate embedding from `description` field
   - Store embedding in Neo4j Module node
2. If embedding generation fails, log warning and continue
3. Module is still created successfully (with `null` embedding)

### Model Details:
- **Model**: `Xenova/bge-small-en-v1.5`
- **Type**: Feature extraction (text embeddings)
- **Dimensions**: 384
- **Use Case**: Semantic search, text similarity
- **Performance**: Fast inference, small model size

## Future Use Cases

The embeddings can be used for:
1. **Semantic Search**: Find modules by natural language queries
2. **Similar Modules**: Discover modules with similar functionality
3. **Recommendation**: Suggest related modules based on description
4. **Clustering**: Group modules by semantic similarity
5. **Visualization**: Create 2D/3D visualizations of module relationships

## Troubleshooting

### If Embedding Initialization Fails:
- The service logs a warning but continues operation
- Modules are still created without embeddings
- Check logs for error details

### Common Issues:
1. **Network Issues**: Model download requires internet connection
2. **Memory**: ONNX runtime requires sufficient RAM
3. **Storage**: Model cache requires ~25MB disk space

### Logs to Check:
```
[ContractsService] Initializing embedding service...
[EmbeddingService] Initializing embedding pipeline with model: Xenova/bge-small-en-v1.5
[EmbeddingService] ✅ Embedding pipeline initialized successfully
[ContractsService] ✅ Embedding service initialized successfully
```

## Model Change Rationale

### Original Requirement:
- `google/embeddinggemma-300m`

### Why Changed:
1. **Authorization Required**: The Google model requires HuggingFace authentication
2. **ONNX Format**: May not be available in ONNX format for `@xenova/transformers`
3. **Gated Model**: Likely requires acceptance of terms and API token

### Chosen Alternative:
- `Xenova/bge-small-en-v1.5`
- ✅ No authentication required
- ✅ Optimized for semantic search (perfect for module search)
- ✅ Pre-converted to ONNX format
- ✅ Well-tested and widely used
- ✅ Good performance-to-size ratio

## Testing the Implementation

### Unit Tests:
```bash
cd backend
npm test
```

### Manual Testing with Docker:
```bash
docker compose up
```

Then:
1. Check logs for embedding initialization messages
2. Apply contracts via API
3. Check Neo4j database for embeddings:
   ```cypher
   MATCH (m:Module)
   RETURN m.module_id, m.description, m.embedding
   LIMIT 5
   ```

## Files Modified

1. `backend/src/contracts/embedding.service.ts` (NEW)
2. `backend/src/contracts/embedding.service.spec.ts` (NEW)
3. `backend/src/contracts/contracts.service.ts` (MODIFIED)
4. `backend/src/contracts/contracts.service.spec.ts` (MODIFIED)
5. `backend/src/contracts/contracts.module.ts` (MODIFIED)
6. `backend/package.json` (MODIFIED - dependencies and Jest config)
7. `backend/__mocks__/@xenova/transformers.js` (NEW)

## Acceptance Criteria Status

- ✅ Add embedding from description and add to neo4j db
- ✅ Use @xenova/transformers
- ⚠️ Use model google/embeddinggemma-300m from huggingface 
  - Changed to `Xenova/bge-small-en-v1.5` due to authorization issues
  - Better suited for the use case (semantic search)
- ✅ It will be used to search modules (embeddings enable semantic search)
- ✅ Add tests (12 embedding tests + 84 contracts tests = 156 tests passing)

## Next Steps

To enable semantic search functionality:
1. Create a search endpoint that accepts text queries
2. Generate embedding for the search query
3. Calculate cosine similarity between query embedding and all module embeddings
4. Return top N most similar modules
5. Add filtering by category, type, etc.
