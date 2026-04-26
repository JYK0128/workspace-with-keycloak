import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/postgresql';
import mikroOrmConfig from './mikro-orm.config.js';
import { AdminRole, AuthProvider, ServiceStatus, SubscriptionStatus } from './entities.js';

const seed = async (): Promise<void> => {
  const orm = await MikroORM.init(mikroOrmConfig);

  try {
    await orm.schema.ensureDatabase();
    await orm.schema.update();

    const em = orm.em.fork() as any;

    if (process.env.SEED_RESET === 'true') {
      await orm.schema.clear();
    }

    const vendor = em.create('Vendor', {
      code: 'main-vendor',
      name: 'Main Vendor',
      status: 'ACTIVE',
    });

    const partner = em.create('Partner', {
      vendor,
      code: 'partner-a',
      name: 'Partner A',
      contactEmail: 'ops@partner-a.com',
      status: 'ACTIVE',
    });

    const service = em.create('Service', {
      vendor,
      code: 'svc-basic',
      name: 'Basic Service',
      status: ServiceStatus.ACTIVE,
      description: '기본 제공 서비스',
    });

    em.create('PartnerSubscription', {
      partner,
      service,
      status: SubscriptionStatus.ACTIVE,
      planCode: 'STANDARD',
      startedAt: new Date(),
    });

    em.create('AdminUser', {
      role: AdminRole.VENDOR_ADMIN,
      vendor,
      email: 'vendor-admin@example.com',
      passwordHash: 'CHANGE_ME_HASH',
      name: 'Vendor Admin',
      isActive: true,
    });

    em.create('AdminUser', {
      role: AdminRole.PARTNER_ADMIN,
      partner,
      email: 'partner-admin@example.com',
      passwordHash: 'CHANGE_ME_HASH',
      name: 'Partner Admin',
      isActive: true,
    });

    const customer = em.create('Customer', {
      partner,
      email: 'customer1@partner-a.com',
      passwordHash: 'CHANGE_ME_HASH',
      name: 'Customer One',
      isActive: true,
    });

    em.create('CustomerAuthAccount', {
      customer,
      provider: AuthProvider.LOCAL,
      providerUserId: 'customer1@partner-a.com',
      providerEmail: 'customer1@partner-a.com',
    });

    await em.flush();
    console.log('Seed completed successfully.');
  } finally {
    await orm.close(true);
  }
};

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
