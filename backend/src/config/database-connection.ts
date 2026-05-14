/**
 * Database Connection Manager
 * 
 * Manages database connections with resilience, retry logic, and health monitoring.
 */

import { PrismaClient } from '@prisma/client';

export interface ConnectionConfig {
  url: string;
  poolSize: number;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface ConnectionHealth {
  isConnected: boolean;
  poolSize: number;
  activeConnections: number;
  idleConnections: number;
  lastCheck: Date;
  uptime: number;
}

type ConnectionEventCallback = () => void;

export class DatabaseConnectionManager {
  private prisma: PrismaClient | null = null;
  private config: ConnectionConfig | null = null;
  private isConnected: boolean = false;
  private connectionStartTime: Date | null = null;
  private retryCount: number = 0;
  
  private onConnectionLostCallbacks: ConnectionEventCallback[] = [];
  private onConnectionRestoredCallbacks: ConnectionEventCallback[] = [];

  /**
   * Initialize database connection
   */
  async initialize(config: ConnectionConfig): Promise<void> {
    this.config = config;
    
    console.log('🔌 Initializing database connection...');
    console.log(`   Pool Size: ${config.poolSize}`);
    console.log(`   Timeout: ${config.timeout}ms`);
    console.log(`   Max Retries: ${config.maxRetries}`);

    await this.connect();
  }

  /**
   * Connect to database with retry logic
   */
  private async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Connection manager not initialized');
    }

    this.retryCount = 0;

    while (this.retryCount < this.config.maxRetries) {
      try {
        // Create Prisma client if not exists
        if (!this.prisma) {
          this.prisma = new PrismaClient({
            datasources: {
              db: {
                url: this.config.url
              }
            },
            log: ['error', 'warn']
          });
        }

        // Test connection
        await this.prisma.$connect();
        await this.prisma.$queryRaw`SELECT 1`;

        this.isConnected = true;
        this.connectionStartTime = new Date();
        this.retryCount = 0;

        console.log('✅ Database connection established successfully');
        
        // Trigger connection restored callbacks
        this.triggerConnectionRestored();

        return;
      } catch (error) {
        this.retryCount++;
        this.isConnected = false;

        console.error(`❌ Database connection attempt ${this.retryCount}/${this.config.maxRetries} failed:`);
        console.error(`   ${(error as Error).message}`);

        if (this.retryCount >= this.config.maxRetries) {
          console.error('❌ Max connection retries reached. Giving up.');
          throw new Error(`Failed to connect to database after ${this.config.maxRetries} attempts`);
        }

        // Calculate delay with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, this.retryCount - 1);
        console.log(`   Retrying in ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }
  }

  /**
   * Reconnect to database
   */
  async reconnect(): Promise<void> {
    console.log('🔄 Reconnecting to database...');
    
    if (this.prisma) {
      try {
        await this.prisma.$disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
      this.prisma = null;
    }

    this.isConnected = false;
    await this.connect();
  }

  /**
   * Get Prisma client instance
   */
  getConnection(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database connection not initialized');
    }

    if (!this.isConnected) {
      throw new Error('Database connection lost. Attempting to reconnect...');
    }

    return this.prisma;
  }

  /**
   * Check connection health
   */
  async checkHealth(): Promise<ConnectionHealth> {
    const health: ConnectionHealth = {
      isConnected: this.isConnected,
      poolSize: this.config?.poolSize || 0,
      activeConnections: 0,
      idleConnections: 0,
      lastCheck: new Date(),
      uptime: this.connectionStartTime 
        ? Date.now() - this.connectionStartTime.getTime()
        : 0
    };

    if (this.prisma && this.isConnected) {
      try {
        // Test connection
        await this.prisma.$queryRaw`SELECT 1`;
        health.isConnected = true;
      } catch (error) {
        health.isConnected = false;
        this.isConnected = false;
        
        console.error('❌ Database health check failed:', (error as Error).message);
        
        // Trigger connection lost callbacks
        this.triggerConnectionLost();

        // Attempt reconnection
        try {
          await this.reconnect();
        } catch (reconnectError) {
          console.error('❌ Reconnection failed:', (reconnectError as Error).message);
        }
      }
    }

    return health;
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from database...');
    
    if (this.prisma) {
      try {
        await this.prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
      } catch (error) {
        console.error('❌ Error disconnecting from database:', (error as Error).message);
      }
      
      this.prisma = null;
      this.isConnected = false;
      this.connectionStartTime = null;
    }
  }

  /**
   * Register callback for connection lost event
   */
  onConnectionLost(callback: ConnectionEventCallback): void {
    this.onConnectionLostCallbacks.push(callback);
  }

  /**
   * Register callback for connection restored event
   */
  onConnectionRestored(callback: ConnectionEventCallback): void {
    this.onConnectionRestoredCallbacks.push(callback);
  }

  /**
   * Trigger connection lost callbacks
   */
  private triggerConnectionLost(): void {
    this.onConnectionLostCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in connection lost callback:', error);
      }
    });
  }

  /**
   * Trigger connection restored callbacks
   */
  private triggerConnectionRestored(): void {
    this.onConnectionRestoredCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in connection restored callback:', error);
      }
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection status
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection uptime in milliseconds
   */
  getUptime(): number {
    if (!this.connectionStartTime) {
      return 0;
    }
    return Date.now() - this.connectionStartTime.getTime();
  }
}

// Export singleton instance
export const dbConnectionManager = new DatabaseConnectionManager();
