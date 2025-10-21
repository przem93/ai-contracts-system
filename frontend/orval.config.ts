import { defineConfig } from "orval";
import * as fs from "fs";

// Determine OpenAPI spec path based on environment
// In Docker: /app/backend-openapi.json
// Local dev: ../backend/openapi.json
const getOpenApiPath = () => {
  const dockerPath = "/app/backend-openapi.json";
  const localPath = "../backend/openapi.json";
  
  if (fs.existsSync(dockerPath)) {
    return dockerPath;
  }
  return localPath;
};

export default defineConfig({
  "ai-contracts-api": {
    input: {
      target: getOpenApiPath(),
    },
    output: {
      mode: "tags-split",
      target: "./src/api/generated",
      schemas: "./src/api/generated/model",
      client: "react-query",
      httpClient: "axios",
      baseUrl: "http://localhost:3000",
      override: {
        mutator: {
          path: "./src/api/axios-instance.ts",
          name: "customAxiosInstance",
        },
      },
    },
  },
});
