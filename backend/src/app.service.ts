import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
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

  getTestEndpoint() {
    return {
      message: 'Test endpoint is working! This endpoint will be removed later.',
      timestamp: new Date().toISOString(),
      data: {
        backend: 'NestJS',
        database: 'Neo4j',
        status: 'operational',
      },
    };
  }
}
