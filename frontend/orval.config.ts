import { defineConfig } from "orval";

export default defineConfig({
  "ai-contracts-api": {
    input: {
      target: "/app/backend-openapi.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/api/generated",
      schemas: "./src/api/generated/model",
      client: "react-query",
      httpClient: "axios",
      baseUrl: "http://localhost",
      override: {
        mutator: {
          path: "./src/api/axios-instance.ts",
          name: "customAxiosInstance",
        },
      },
    },
  },
});
