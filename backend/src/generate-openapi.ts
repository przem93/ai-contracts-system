import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import * as fs from "fs";
import * as path from "path";

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, {
    logger: false, // Disable logging to avoid noise
  });

  // Set global API prefix (same as in main.ts)
  app.setGlobalPrefix("api");

  const config = new DocumentBuilder()
    .setTitle("AI Contracts System API")
    .setDescription(
      "API for managing and validating technical dependency contracts",
    )
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Write the OpenAPI spec to a file
  const outputPath = path.join(__dirname, "../openapi.json");
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ OpenAPI spec generated at: ${outputPath}`);

  await app.close();
  process.exit(0);
}

generateOpenApiSpec().catch((error) => {
  console.error("Failed to generate OpenAPI spec:", error);
  process.exit(1);
});
