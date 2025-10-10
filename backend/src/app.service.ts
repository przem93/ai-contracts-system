import { Injectable } from '@nestjs/common';
import { Neo4jService } from './neo4j/neo4j.service';

@Injectable()
export class AppService {
  constructor(private readonly neo4jService: Neo4jService) {}

  getHello(): string {
    return 'AI Contracts System - Backend API is running!';
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ai-contracts-backend',
      version: '1.0.0',
    };
  }

  async verifyNeo4jConnection() {
    const connectionStatus = await this.neo4jService.verifyConnection();
    let testQueryResult = null;

    if (connectionStatus.connected) {
      try {
        testQueryResult = await this.neo4jService.testQuery();
      } catch (error) {
        testQueryResult = { error: error.message };
      }
    }

    return {
      timestamp: new Date().toISOString(),
      service: 'ai-contracts-backend',
      neo4j: {
        ...connectionStatus,
        testQuery: testQueryResult,
      },
    };
  }
}
