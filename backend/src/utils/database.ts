import mysql from 'mysql2/promise';
import { Connection, Pool, PoolConnection } from 'mysql2/promise';
import { env } from '../config/env';

interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
  connectionLimit?: number;
  queueLimit?: number;
  charset?: string;
  timezone?: string;
  multipleStatements?: boolean;
  connectTimeout?: number;
}

class DatabaseManager {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    // Database configuration with optimized pooling settings - NO FALLBACKS
    this.config = {
      host: env.database.host,
      user: env.database.user,
      password: env.database.password,
      database: env.database.database,
      port: env.database.port,
      connectionLimit: env.database.poolSize,
      queueLimit: 0, // Unlimited queue
      connectTimeout: env.database.connectionTimeout,
      charset: 'utf8mb4',
      timezone: '+00:00',
      multipleStatements: false, // Security: prevent SQL injection via multiple statements
    };

    this.initializePool();
  }

  /**
   * Initialize the connection pool
   */
  private async initializePool(): Promise<void> {
    try {
      this.pool = mysql.createPool(this.config);

      // Test the connection
      const connection = await this.pool.getConnection();
      console.log('✅ MySQL database connected successfully');
      console.log(`📊 Connected to: ${this.config.database} on ${this.config.host}:${this.config.port}`);

      // Log connection details
      const [rows] = await connection.execute('SELECT VERSION() as version, DATABASE() as current_db');
      const dbInfo = rows as any[];
      console.log(`🗄️  MySQL Version: ${dbInfo[0].version}`);
      console.log(`📁 Current Database: ${dbInfo[0].current_db}`);

      connection.release();
    } catch (error) {
      console.error('❌ MySQL connection failed:', error);
      console.error('🔧 Please check your database configuration:');
      console.error(`   Host: ${this.config.host}`);
      console.error(`   Port: ${this.config.port}`);
      console.error(`   Database: ${this.config.database}`);
      console.error(`   User: ${this.config.user}`);
      throw new Error(`Database connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(): Promise<PoolConnection> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    try {
      const connection = await this.pool.getConnection();
      return connection;
    } catch (error) {
      console.error('❌ Failed to get database connection:', error);
      throw new Error(`Failed to get database connection: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a SELECT query and return all rows with query optimization
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    const connection = await this.getConnection();

    try {
      // Convert undefined to null for MySQL compatibility
      const cleanParams = params.map(param => param === undefined ? null : param);

      // Add query timeout for performance monitoring
      const startTime = Date.now();
      const [rows] = await connection.execute(sql, cleanParams);
      const queryTime = Date.now() - startTime;

      // Log slow queries (>100ms)
      if (queryTime > 100) {
        console.warn(`🐌 Slow query (${queryTime}ms):`, sql.substring(0, 100) + '...');
      }

      return rows as any[];
    } catch (error) {
      console.error('❌ Database query error:', error);
      console.error('🔍 SQL:', sql);
      console.error('📊 Params:', params);
      throw new Error(`Database query failed: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Execute a SELECT query and return a single row
   */
  async get(sql: string, params: any[] = []): Promise<any> {
    const connection = await this.getConnection();

    try {
      // Convert undefined to null for MySQL compatibility
      const cleanParams = params.map(param => param === undefined ? null : param);
      const [rows] = await connection.execute(sql, cleanParams);
      const result = rows as any[];
      return result[0] || null;
    } catch (error) {
      console.error('❌ Database get error:', error);
      console.error('🔍 SQL:', sql);
      console.error('📊 Params:', params);
      throw new Error(`Database get failed: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Execute INSERT, UPDATE, DELETE queries
   */
  async run(sql: string, params: any[] = []): Promise<any> {
    const connection = await this.getConnection();

    try {
      // Convert undefined to null for MySQL compatibility
      const cleanParams = params.map(param => param === undefined ? null : param);
      const [result] = await connection.execute(sql, cleanParams);
      return result;
    } catch (error) {
      console.error('❌ Database run error:', error);
      console.error('🔍 SQL:', sql);
      console.error('📊 Params:', params);
      throw new Error(`Database operation failed: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction(queries: Array<{ sql: string; params: any[] }>): Promise<any[]> {
    const connection = await this.getConnection();

    try {
      await connection.beginTransaction();

      const results = [];
      for (const query of queries) {
        const [result] = await connection.execute(query.sql, query.params);
        results.push(result);
      }

      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      console.error('❌ Database transaction error:', error);
      throw new Error(`Database transaction failed: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Count records in a table
   */
  async count(tableName: string, whereClause: string = '', params: any[] = []): Promise<number> {
    const where = whereClause ? `WHERE ${whereClause}` : '';
    const sql = `SELECT COUNT(*) as count FROM ${tableName} ${where}`;
    const result = await this.get(sql, params);
    return result?.count || 0;
  }

  /**
   * Get all records from a table with optional filtering
   */
  async getAll(
    tableName: string,
    options: {
      where?: string;
      params?: any[];
      orderBy?: string;
      limit?: number;
      offset?: number;
      select?: string;
    } = {}
  ): Promise<any[]> {
    const {
      where = '',
      params = [],
      orderBy = '',
      limit = 100,
      offset = 0,
      select = '*'
    } = options;

    let sql = `SELECT ${select} FROM ${tableName}`;

    if (where) {
      sql += ` WHERE ${where}`;
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    return this.query(sql, params);
  }

  /**
   * Insert a record and return the insert ID
   */
  async insert(tableName: string, data: Record<string, any>): Promise<number> {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    const result = await this.run(sql, values);

    return (result as any).insertId;
  }

  /**
   * Update records in a table
   */
  async update(
    tableName: string,
    data: Record<string, any>,
    whereClause: string,
    whereParams: any[] = []
  ): Promise<number> {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
    const result = await this.run(sql, values);

    return (result as any).affectedRows;
  }

  /**
   * Delete records from a table
   */
  async delete(tableName: string, whereClause: string, whereParams: any[] = []): Promise<number> {
    const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    const result = await this.run(sql, whereParams);

    return (result as any).affectedRows;
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.get(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
        [this.config.database, tableName]
      );
      return result.count > 0;
    } catch (error) {
      console.error('❌ Error checking table existence:', error);
      return false;
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    const sql = `
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_KEY,
        EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    return this.query(sql, [this.config.database, tableName]);
  }

  /**
   * Health check - test database connectivity
   */
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    try {
      const startTime = Date.now();
      const result = await this.get('SELECT 1 as test, NOW() as current_time');
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        message: `Database connection successful (${responseTime}ms)`,
        timestamp: result.current_time
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 MySQL connection pool closed');
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<any> {
    try {
      const [dbStats] = await this.query(`
        SELECT
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM orders) as total_orders,
          (SELECT COUNT(*) FROM products) as total_products,
          (SELECT COUNT(*) FROM bookings) as total_bookings,
          (SELECT SUM(total) FROM orders WHERE status = 'DELIVERED') as total_revenue
      `);

      const poolStats = {
        totalConnections: 0, // Pool stats not directly available in mysql2
        activeConnections: 0,
        idleConnections: 0,
      };

      return {
        database: dbStats,
        connectionPool: poolStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      throw new Error(`Failed to get database stats: ${(error as Error).message}`);
    }
  }
}

// Singleton instance
export const dbManager = new DatabaseManager();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, closing database connections...');
  await dbManager.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing database connections...');
  await dbManager.close();
  process.exit(0);
});

export default dbManager;