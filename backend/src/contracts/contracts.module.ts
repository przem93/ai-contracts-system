import { Module } from "@nestjs/common";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { EmbeddingService } from "./embedding.service";
import { Neo4jModule } from "../neo4j/neo4j.module";

@Module({
  imports: [Neo4jModule],
  controllers: [ContractsController],
  providers: [ContractsService, EmbeddingService],
  exports: [ContractsService],
})
export class ContractsModule {}
