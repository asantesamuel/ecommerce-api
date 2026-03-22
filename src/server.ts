import 'reflect-metadata';
import { createApp } from './app';
import { AppDataSource } from './config/database';
import { env } from './config/env';

const PORT = Number(env.PORT) || 3000;

async function bootstrap() {
  await AppDataSource.initialize();
  console.log('✅ Database connected');

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📖 Swagger UI at  http://localhost:${PORT}/docs`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
