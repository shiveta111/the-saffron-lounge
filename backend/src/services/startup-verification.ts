import { PrismaClient } from '@prisma/client';
import { execFileSync, execSync } from 'child_process';

export interface StartupCheckResult {
  database: { connected: boolean; schemaValid: boolean; hasData: boolean; adminUserExists: boolean };
  overall: { success: boolean; errors: string[]; warnings: string[]; duration: number };
}

export class StartupVerificationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async performChecks(): Promise<StartupCheckResult> {
    const startTime = Date.now();
    const result: StartupCheckResult = {
      database: { connected: false, schemaValid: false, hasData: false, adminUserExists: false },
      overall: { success: false, errors: [], warnings: [], duration: 0 }
    };

    try {
      result.database.connected = await this.checkDatabaseConnection();
      if (!result.database.connected) {
        result.overall.errors.push('Database connection failed');
        result.overall.duration = Date.now() - startTime;
        return result;
      }

      result.database.schemaValid = await this.checkSchema();
      result.database.hasData = await this.checkDataExists();
      result.database.adminUserExists = await this.checkAdminUser();

      if (!result.database.hasData || !result.database.adminUserExists) {
        result.overall.warnings.push('Database needs seeding');
        await this.triggerRecovery();
      }

      result.overall.success = result.database.connected && result.database.schemaValid;
    } catch (error) {
      result.overall.errors.push((error as Error).message);
    }

    result.overall.duration = Date.now() - startTime;
    return result;
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch { return false; }
  }

  private async checkSchema(): Promise<boolean> {
    try {
      await this.prisma.user.findFirst();
      return true;
    } catch { return false; }
  }

  private async checkDataExists(): Promise<boolean> {
    try {
      const count = await this.prisma.user.count();
      return count > 0;
    } catch { return false; }
  }

  private async checkAdminUser(): Promise<boolean> {
    try {
      const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
      return !!admin;
    } catch { return false; }
  }

  private async triggerRecovery(): Promise<void> {
    try {
      console.log('🔄 Triggering database recovery...');
      // SECURITY FIX: Use execFileSync to prevent command injection
      execFileSync('node', ['prisma/seed.js'], { stdio: 'inherit', shell: false });
    } catch (error) {
      console.error('Recovery failed:', error);
    }
  }
}

export const startupVerification = new StartupVerificationService();
