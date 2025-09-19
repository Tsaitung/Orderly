import { PrismaClient } from '@prisma/client';

/**
 * Prisma database client configuration
 * Singleton pattern to ensure single instance across the application
 */
class Database {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!Database.instance) {
      Database.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty',
      });

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        await Database.instance.$disconnect();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await Database.instance.$disconnect();
        process.exit(0);
      });
    }

    return Database.instance;
  }

  static async disconnect(): Promise<void> {
    if (Database.instance) {
      await Database.instance.$disconnect();
    }
  }
}

export const prisma = Database.getInstance();
export default Database;