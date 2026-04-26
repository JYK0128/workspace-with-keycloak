import { defineConfig } from '@mikro-orm/postgresql';
import { entities } from './entities.js';

export default defineConfig({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  dbName: process.env.DB_NAME ?? 'b2b2c',
  schema: 'app',
  entities,
  debug: process.env.NODE_ENV !== 'production',
});
