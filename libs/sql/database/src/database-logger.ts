import { Logger as NestLogger } from '@nestjs/common';
import type { Logger } from 'typeorm';

// TypeORM's lines through Nest's logger: migrations as they run, and failing or slow (over a second) queries as warnings.
export class DatabaseLogger implements Logger {
  private readonly logger = new NestLogger('Database');

  logQuery(): void {
    // Every query: not logged.
  }

  logQueryError(error: string | Error, query: string): void {
    const message = error instanceof Error ? error.message : error;
    this.logger.warn(`Query failed (${message}): ${query}`);
  }

  logQuerySlow(time: number, query: string): void {
    this.logger.warn(`Slow query (${time} ms): ${query}`);
  }

  logSchemaBuild(message: string): void {
    this.logger.log(message);
  }

  // TypeORM's word for a migration that failed (it fails the boot too).
  logMigration(message: string): void {
    if (/failed/i.test(message)) this.logger.error(message);
    else this.logger.log(message);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    if (level === 'warn') this.logger.warn(String(message));
  }
}
