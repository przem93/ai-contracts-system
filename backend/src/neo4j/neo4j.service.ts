import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver;

  async onModuleInit() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

    // Verify connectivity
    try {
      await this.driver.verifyConnectivity();
      console.log('✅ Successfully connected to Neo4j database');
    } catch (error) {
      console.error('❌ Failed to connect to Neo4j database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
      console.log('🔌 Neo4j connection closed');
    }
  }

  getDriver(): Driver {
    return this.driver;
  }

  getSession(): Session {
    return this.driver.session();
  }

  async verifyConnection(): Promise<{
    connected: boolean;
    message: string;
    serverInfo?: any;
  }> {
    try {
      const serverInfo = await this.driver.getServerInfo();
      return {
        connected: true,
        message: 'Successfully connected to Neo4j',
        serverInfo: {
          address: serverInfo.address,
          version: serverInfo.agent,
        },
      };
    } catch (error) {
      return {
        connected: false,
        message: `Failed to connect to Neo4j: ${error.message}`,
      };
    }
  }

  async testQuery(): Promise<any> {
    const session = this.getSession();
    try {
      // Simple query to verify database connection
      const result = await session.run('RETURN "Hello from Neo4j!" AS message, timestamp() AS timestamp');
      const record = result.records[0];
      return {
        message: record.get('message'),
        timestamp: record.get('timestamp').toNumber(),
      };
    } finally {
      await session.close();
    }
  }
}
