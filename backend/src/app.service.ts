import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { DB_CONNECTION_POOL } from './database/database.constants';

@Injectable()
export class AppService {
  constructor(@Inject(DB_CONNECTION_POOL) private dbPool: Pool) {}

  async getDbStatus(): Promise<string> {
    try {
      await this.dbPool.query('SELECT 1');
      return 'Connected';
    } catch (e) {
      console.error('Database connection failed:', e);
      return 'Not Connected';
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
