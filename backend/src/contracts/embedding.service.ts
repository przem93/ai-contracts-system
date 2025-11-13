import { Injectable, Logger } from "@nestjs/common";
import { pipeline, env } from "@xenova/transformers";

// Disable local model cache check - use cache directly
env.allowLocalModels = false;

/**
 * Service for generating text embeddings using the google/embeddinggemma-300m model
 * from HuggingFace via @xenova/transformers
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private embeddingPipeline: any;
  private readonly modelName = "google/embeddinggemma-300m";

  /**
   * Initialize the embedding pipeline
   * This loads the model from HuggingFace
   */
  async initialize(): Promise<void> {
    try {
      this.logger.log(
        `Initializing embedding pipeline with model: ${this.modelName}`,
      );
      this.embeddingPipeline = await pipeline(
        "feature-extraction",
        this.modelName,
      );
      this.logger.log("✅ Embedding pipeline initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize embedding pipeline:", error);
      throw new Error(
        `Failed to initialize embedding pipeline: ${error.message}`,
      );
    }
  }

  /**
   * Generate an embedding vector from a text description
   * @param text The text to generate an embedding for
   * @returns Array of numbers representing the embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingPipeline) {
      throw new Error(
        "Embedding pipeline not initialized. Call initialize() first.",
      );
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    try {
      this.logger.log(
        `Generating embedding for text: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`,
      );

      // Generate embedding
      const result = await this.embeddingPipeline(text, {
        pooling: "mean",
        normalize: true,
      });

      // Convert tensor to array
      const embedding = Array.from(result.data) as number[];

      this.logger.log(
        `✅ Generated embedding with ${embedding.length} dimensions`,
      );

      return embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts Array of texts to generate embeddings for
   * @returns Array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.embeddingPipeline) {
      throw new Error(
        "Embedding pipeline not initialized. Call initialize() first.",
      );
    }

    if (!texts || texts.length === 0) {
      return [];
    }

    try {
      this.logger.log(`Generating embeddings for ${texts.length} texts`);

      const embeddings: number[][] = [];
      for (const text of texts) {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);
      }

      this.logger.log(`✅ Generated ${embeddings.length} embeddings`);

      return embeddings;
    } catch (error) {
      this.logger.error(`Failed to generate embeddings: ${error.message}`);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Check if the embedding service is ready
   * @returns true if the pipeline is initialized
   */
  isReady(): boolean {
    return !!this.embeddingPipeline;
  }
}
