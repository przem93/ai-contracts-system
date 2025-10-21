import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("neo4j/verify")
  async verifyNeo4jConnection() {
    return this.appService.verifyNeo4jConnection();
  }
}
