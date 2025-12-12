import { Test, TestingModule } from "@nestjs/testing";
import { EmbeddingService } from "./embedding.service";

// Mock @xenova/transformers module
jest.mock("@xenova/transformers", () => ({
  pipeline: jest.fn(),
  env: {
    allowLocalModels: false,
  },
}));

import { pipeline } from "@xenova/transformers";

describe("EmbeddingService", () => {
  let service: EmbeddingService;
  let mockPipeline: jest.Mock;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock pipeline function
    mockPipeline = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbeddingService],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("isReady", () => {
    it("should return false before initialization", () => {
      expect(service.isReady()).toBe(false);
    });

    it("should return true after initialization", async () => {
      // Mock the pipeline function to return a mock embedding function
      (pipeline as jest.Mock).mockResolvedValue(mockPipeline);

      await service.initialize();
      expect(service.isReady()).toBe(true);
      expect(pipeline).toHaveBeenCalledWith("feature-extraction", "Xenova/bge-small-en-v1.5");
    });
  });

  describe("generateEmbedding", () => {
    beforeEach(async () => {
      // Mock the pipeline function to return a mock embedding function
      (pipeline as jest.Mock).mockResolvedValue(mockPipeline);
      await service.initialize();
    });

    it("should generate embedding for valid text", async () => {
      const text = "This is a test description for a module";
      const mockEmbeddingData = [0.1, 0.2, 0.3, 0.4, 0.5];
      
      // Mock the embedding pipeline to return embedding data
      mockPipeline.mockResolvedValue({
        data: mockEmbeddingData,
      });

      const embedding = await service.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(5);
      expect(embedding).toEqual(mockEmbeddingData);
      expect(mockPipeline).toHaveBeenCalledWith(text, {
        pooling: "mean",
        normalize: true,
      });
    });

    it("should generate consistent embeddings for same text", async () => {
      const text = "Users get endpoint";
      const mockEmbeddingData = [0.1, 0.2, 0.3];
      
      mockPipeline.mockResolvedValue({
        data: mockEmbeddingData,
      });

      const embedding1 = await service.generateEmbedding(text);
      const embedding2 = await service.generateEmbedding(text);

      expect(embedding1.length).toBe(embedding2.length);
      expect(embedding1).toEqual(embedding2);
    });

    it("should generate different embeddings for different texts", async () => {
      const text1 = "Users authentication service";
      const text2 = "Payment processing endpoint";
      const mockEmbedding1 = [0.1, 0.2, 0.3];
      const mockEmbedding2 = [0.7, 0.8, 0.9];
      
      // Mock different embeddings for different texts
      mockPipeline
        .mockResolvedValueOnce({ data: mockEmbedding1 })
        .mockResolvedValueOnce({ data: mockEmbedding2 });

      const embedding1 = await service.generateEmbedding(text1);
      const embedding2 = await service.generateEmbedding(text2);

      expect(embedding1).not.toEqual(embedding2);
      expect(embedding1).toEqual(mockEmbedding1);
      expect(embedding2).toEqual(mockEmbedding2);
    });

    it("should throw error for empty text", async () => {
      await expect(service.generateEmbedding("")).rejects.toThrow(
        "Text cannot be empty",
      );
    });

    it("should throw error for whitespace-only text", async () => {
      await expect(service.generateEmbedding("   ")).rejects.toThrow(
        "Text cannot be empty",
      );
    });

    it("should throw error if not initialized", async () => {
      const uninitializedService = new EmbeddingService();
      await expect(
        uninitializedService.generateEmbedding("test"),
      ).rejects.toThrow("Embedding pipeline not initialized");
    });
  });

  describe("generateEmbeddings", () => {
    beforeEach(async () => {
      // Mock the pipeline function to return a mock embedding function
      (pipeline as jest.Mock).mockResolvedValue(mockPipeline);
      await service.initialize();
    });

    it("should generate embeddings for multiple texts", async () => {
      const texts = [
        "Users get endpoint",
        "Users permissions service",
        "Payment processing",
      ];
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ];

      // Mock different embeddings for each text
      mockPipeline
        .mockResolvedValueOnce({ data: mockEmbeddings[0] })
        .mockResolvedValueOnce({ data: mockEmbeddings[1] })
        .mockResolvedValueOnce({ data: mockEmbeddings[2] });

      const embeddings = await service.generateEmbeddings(texts);

      expect(embeddings).toBeDefined();
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(texts.length);
      expect(embeddings).toEqual(mockEmbeddings);
    });

    it("should return empty array for empty input", async () => {
      const embeddings = await service.generateEmbeddings([]);
      expect(embeddings).toEqual([]);
    });

    it("should throw error if not initialized", async () => {
      const uninitializedService = new EmbeddingService();
      await expect(
        uninitializedService.generateEmbeddings(["test"]),
      ).rejects.toThrow("Embedding pipeline not initialized");
    });
  });
});
