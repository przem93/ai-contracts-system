import { Module } from "@nestjs/common";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { Neo4jModule } from "../neo4j/neo4j.module";

@Module({
  imports: [Neo4jModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
