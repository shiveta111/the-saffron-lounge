import { PrismaClient } from '@prisma/client';

export interface IntegrityCheck {
  timestamp: Date;
  tables: Map<string, { count: number; previousCount: number; change: number }>;
  alerts: string[];
}

export interface MonitorConfig {
  checkInterval: number;
  alertThreshold: number;
  criticalTables: string[];
}

export class DataIntegrityMonitor {
  private prisma: PrismaClient;
  private intervalId: NodeJS.Timeout | null = null;
  private previousCounts: Map<string, number> = new Map();
  private history: IntegrityCheck[] = [];

  constructor() {
    this.prisma = new PrismaClient();
  }

  start(config: MonitorConfig): void {
    console.log('🔍 Starting data integrity monitor...');
    
    this.intervalId = setInterval(async () => {
      await this.performCheck(config);
    }, config.checkInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Data integrity monitor stopped');
    }
  }

  async performCheck(config: MonitorConfig): Promise<IntegrityCheck> {
    const check: IntegrityCheck = {
      timestamp: new Date(),
      tables: new Map(),
      alerts: []
    };

    try {
      for (const table of config.criticalTables) {
        const count = await this.getTableCount(table);
        const previousCount = this.previousCounts.get(table) || count;
        const change = count - previousCount;

        check.tables.set(table, { count, previousCount, change });

        if (change < 0 && Math.abs(change / previousCount) > config.alertThreshold) {
          check.alerts.push(`⚠️ ${table}: Lost ${Math.abs(change)} records (${Math.abs(change / previousCount * 100).toFixed(1)}%)`);
        }

        this.previousCounts.set(table, count);
      }

      if (check.alerts.length > 0) {
        console.warn('⚠️ Data integrity alerts:', check.alerts);
      }

      this.history.push(check);
      if (this.history.length > 100) this.history.shift();

    } catch (error) {
      check.alerts.push(`Error: ${(error as Error).message}`);
    }

    return check;
  }

  private async getTableCount(table: string): Promise<number> {
    const model = (this.prisma as any)[table];
    if (!model) return 0;
    return await model.count();
  }

  getHistory(): IntegrityCheck[] {
    return this.history;
  }
}

export const integrityMonitor = new DataIntegrityMonitor();
