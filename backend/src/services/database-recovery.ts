import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface RecoveryResult {
  success: boolean;
  actions: string[];
  errors: string[];
  duration: number;
}

export class DatabaseRecoveryService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async recover(): Promise<RecoveryResult> {
    const startTime = Date.now();
    const result: RecoveryResult = { success: false, actions: [], errors: [], duration: 0 };

    try {
      const userCount = await this.prisma.user.count();
      
      if (userCount === 0) {
        result.actions.push('Creating admin user');
        await this.createAdminUser();
        
        result.actions.push('Creating essential categories');
        await this.createEssentialCategories();
        
        result.success = true;
      } else {
        result.actions.push('Database already has data, skipping recovery');
        result.success = true;
      }
    } catch (error) {
      result.errors.push((error as Error).message);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async createAdminUser(): Promise<void> {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await this.prisma.user.create({
      data: {
        email: 'admin@saffronlounge.com',
        password: hashedPassword,
        name: 'System Admin',
        role: 'ADMIN',
        emailVerified: true,
        isActive: true,
        phone: '+1-555-0100',
        loyaltyPoints: 0
      }
    });
  }

  private async createEssentialCategories(): Promise<void> {
    const categories = [
      { name: 'Appetizers', description: 'Starters', isActive: true, sortOrder: 1 },
      { name: 'Main Course', description: 'Main dishes', isActive: true, sortOrder: 2 },
      { name: 'Desserts', description: 'Sweets', isActive: true, sortOrder: 3 }
    ];

    for (const cat of categories) {
      await this.prisma.category.create({ data: cat });
    }
  }
}

export const dbRecovery = new DatabaseRecoveryService();
