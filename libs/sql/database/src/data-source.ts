// The TypeORM CLI's entry (pnpm typeorm:*). See CLAUDE.md's Database.
import { DataSource } from 'typeorm';
import { postgresOptions } from './sql.module';

export default new DataSource(postgresOptions(process.env));
