/**
 * Environment Configuration Validator
 * 
 * Validates environment configuration before server startup to prevent
 * database connection issues and data loss.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentConfig {
  DATABASE_URL: string;
  AUTO_SEED_ON_EMPTY: boolean;
  DB_CONNECTION_TIMEOUT: number;
  DB_MAX_RETRIES: number;
  DB_POOL_SIZE: number;
  NODE_ENV: string;
  PORT: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: EnvironmentConfig | null;
}

export class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validate all environment configuration
   */
  validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Check if .env file exists
    if (!this.checkEnvFileExists()) {
      return {
        isValid: false,
        errors: this.errors,
        warnings: this.warnings,
        config: null
      };
    }

    // Load and validate configuration
    const config = this.loadConfig();
    
    if (!config) {
      return {
        isValid: false,
        errors: this.errors,
        warnings: this.warnings,
        config: null
      };
    }

    // Validate DATABASE_URL
    this.validateDatabaseUrl(config.DATABASE_URL);

    // Validate numeric settings
    this.validateNumericSettings(config);

    // Check database availability
    this.checkDatabaseAvailability(config.DATABASE_URL);

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      config: config
    };
  }

  /**
   * Check if .env-main or .env file exists
   */
  private checkEnvFileExists(): boolean {
    const envMainPath = path.join(process.cwd(), '.env-main');
    const envPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(envMainPath)) {
      return true;
    }
    
    if (fs.existsSync(envPath)) {
      return true;
    }
    
    this.errors.push('Neither .env-main nor .env file found');
    this.errors.push('Solution: Create .env-main or .env file and configure it');
    return false;
  }

  /**
   * Load configuration from environment - NO FALLBACKS
   */
  private loadConfig(): EnvironmentConfig | null {
    try {
      // Check for required variables first
      if (!process.env.DATABASE_URL) {
        this.errors.push('DATABASE_URL is not set in .env file');
        return null;
      }
      if (!process.env.DB_CONNECTION_TIMEOUT) {
        this.errors.push('DB_CONNECTION_TIMEOUT is not set in .env file');
        return null;
      }
      if (!process.env.DB_MAX_RETRIES) {
        this.errors.push('DB_MAX_RETRIES is not set in .env file');
        return null;
      }
      if (!process.env.DB_POOL_SIZE) {
        this.errors.push('DB_POOL_SIZE is not set in .env file');
        return null;
      }
      if (!process.env.NODE_ENV) {
        this.errors.push('NODE_ENV is not set in .env file');
        return null;
      }
      if (!process.env.PORT) {
        this.errors.push('PORT is not set in .env file');
        return null;
      }

      const config: EnvironmentConfig = {
        DATABASE_URL: process.env.DATABASE_URL,
        AUTO_SEED_ON_EMPTY: process.env.AUTO_SEED_ON_EMPTY === 'true',
        DB_CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT),
        DB_MAX_RETRIES: parseInt(process.env.DB_MAX_RETRIES),
        DB_POOL_SIZE: parseInt(process.env.DB_POOL_SIZE),
        NODE_ENV: process.env.NODE_ENV,
        PORT: parseInt(process.env.PORT)
      };

      return config;
    } catch (error) {
      this.errors.push(`Failed to load configuration: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Validate DATABASE_URL format
   */
  validateDatabaseUrl(url: string): boolean {
    if (!url) {
      this.errors.push('DATABASE_URL is empty');
      return false;
    }

    // Check for MySQL format
    const mysqlPattern = /^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/;
    const match = url.match(mysqlPattern);

    if (!match) {
      this.errors.push('DATABASE_URL format is invalid');
      this.errors.push('Expected format: mysql://user:password@host:port/database');
      this.errors.push('Example: mysql://root:@localhost:3306/saffron_db');
      return false;
    }

    const [, user, password, host, port, database] = match;

    // Validate components
    if (!user) {
      this.errors.push('DATABASE_URL: username is missing');
    }

    if (!host) {
      this.errors.push('DATABASE_URL: host is missing');
    }

    if (!port || isNaN(parseInt(port))) {
      this.errors.push('DATABASE_URL: port is invalid');
    }

    if (!database) {
      this.errors.push('DATABASE_URL: database name is missing');
    }

    // Check for common mistakes
    if (host === 'localhost' && password === 'password') {
      this.warnings.push('DATABASE_URL uses Docker credentials but connecting to localhost');
      this.warnings.push('If using XAMPP, password should be empty: mysql://root:@localhost:3306/saffron_db');
      this.warnings.push('If using Docker, ensure Docker container is running');
    }

    return this.errors.length === 0;
  }

  /**
   * Validate numeric settings
   */
  private validateNumericSettings(config: EnvironmentConfig): void {
    if (config.DB_CONNECTION_TIMEOUT < 1000) {
      this.warnings.push('DB_CONNECTION_TIMEOUT is very low (< 1 second)');
      this.warnings.push('Recommended: 10000 (10 seconds)');
    }

    if (config.DB_MAX_RETRIES < 1) {
      this.warnings.push('DB_MAX_RETRIES is too low');
      this.warnings.push('Recommended: 5');
    }

    if (config.DB_POOL_SIZE < 5) {
      this.warnings.push('DB_POOL_SIZE is low');
      this.warnings.push('Recommended: 10 for development, 20+ for production');
    }

    if (config.PORT < 1024 || config.PORT > 65535) {
      this.errors.push('PORT is out of valid range (1024-65535)');
    }
  }

  /**
   * Check if database is available
   */
  private checkDatabaseAvailability(databaseUrl: string): void {
    try {
      // Extract database type and connection details
      const mysqlPattern = /^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/;
      const match = databaseUrl.match(mysqlPattern);

      if (!match) {
        return; // Already reported format error
      }

      const [, user, password, host, port] = match;

      // Check if MySQL is accessible
      // For XAMPP, check if mysql.exe exists
      const xamppMysqlPath = 'C:\\xampp\\mysql\\bin\\mysql.exe';
      
      if (fs.existsSync(xamppMysqlPath)) {
        // SECURITY FIX: XAMPP MySQL detected - use execFileSync to prevent injection
        try {
          const args: string[] = ['-u', user || 'root', '-h', host || 'localhost', '-P', port || '3306', '-e', 'SELECT 1'];
          if (password) {
            args.splice(2, 0, `-p${password}`);
          }
          
          execFileSync(xamppMysqlPath, args, { encoding: 'utf-8', stdio: 'pipe', shell: false });
          // Connection successful
        } catch (error) {
          this.warnings.push('Cannot connect to MySQL database');
          this.warnings.push('Ensure XAMPP MySQL is running (check XAMPP Control Panel)');
        }
      } else {
        // Check for Docker or system MySQL
        this.warnings.push('MySQL client not found in standard locations');
        this.warnings.push('Ensure MySQL/Docker is installed and running');
      }
    } catch (error) {
      // Non-critical error, just add warning
      this.warnings.push('Could not verify database availability');
    }
  }

  /**
   * Get recommended configuration
   */
  getRecommendedConfig(): EnvironmentConfig {
    return {
      DATABASE_URL: 'mysql://root:@localhost:3306/saffron_db',
      AUTO_SEED_ON_EMPTY: true,
      DB_CONNECTION_TIMEOUT: 10000,
      DB_MAX_RETRIES: 5,
      DB_POOL_SIZE: 10,
      NODE_ENV: 'development',
      PORT: 8000
    };
  }

  /**
   * Format validation result for display
   */
  static formatValidationResult(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('Environment Configuration Validation');
    lines.push('='.repeat(80));
    lines.push('');

    if (result.isValid) {
      lines.push('✅ Configuration is valid');
    } else {
      lines.push('❌ Configuration has errors');
    }

    if (result.errors.length > 0) {
      lines.push('');
      lines.push('Errors:');
      result.errors.forEach(error => {
        lines.push(`  ❌ ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      lines.push('');
      lines.push('Warnings:');
      result.warnings.forEach(warning => {
        lines.push(`  ⚠️  ${warning}`);
      });
    }

    if (result.config) {
      lines.push('');
      lines.push('Configuration:');
      lines.push(`  DATABASE_URL: ${result.config.DATABASE_URL}`);
      lines.push(`  AUTO_SEED_ON_EMPTY: ${result.config.AUTO_SEED_ON_EMPTY}`);
      lines.push(`  DB_CONNECTION_TIMEOUT: ${result.config.DB_CONNECTION_TIMEOUT}ms`);
      lines.push(`  DB_MAX_RETRIES: ${result.config.DB_MAX_RETRIES}`);
      lines.push(`  DB_POOL_SIZE: ${result.config.DB_POOL_SIZE}`);
      lines.push(`  NODE_ENV: ${result.config.NODE_ENV}`);
      lines.push(`  PORT: ${result.config.PORT}`);
    }

    lines.push('');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}

// Export singleton instance
export const envValidator = new EnvironmentValidator();
