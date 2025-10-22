import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend access
  app.enableCors();

  // Set global API prefix
  app.setGlobalPrefix("api");

  // Configure Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle("AI Contracts System API")
    .setDescription(
      "API for managing and validating technical dependency contracts",
    )
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Backend server is running on: http://localhost:${port}`);
  console.log(`📚 API endpoints available at: http://localhost:${port}/api/*`);
  console.log(`📚 API documentation available at: http://localhost:${port}/api-docs`);
}

bootstrap();
