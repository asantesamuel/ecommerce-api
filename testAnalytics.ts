import { AppDataSource } from './src/config/database';
import { AdminService } from './src/modules/admin/admin.service';

async function run() {
  await AppDataSource.initialize();
  const service = new AdminService();
  try {
    const res = await service.getAnalytics({ sub: 'admin', role: 'admin' } as any);
    console.log("Success", res);
  } catch (err) {
    console.error("FAILED", err);
  }
  process.exit(0);
}

run();
