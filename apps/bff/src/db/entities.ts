import { EntitySchema } from '@mikro-orm/core';

export enum AdminRole {
  VENDOR_ADMIN = 'VENDOR_ADMIN',
  PARTNER_ADMIN = 'PARTNER_ADMIN',
}

export enum ServiceStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  KAKAO = 'KAKAO',
  NAVER = 'NAVER',
  APPLE = 'APPLE',
}

const baseProps = {
  id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
  createdAt: { type: 'datetime', columnType: 'timestamptz', defaultRaw: 'now()' },
  updatedAt: { type: 'datetime', columnType: 'timestamptz', defaultRaw: 'now()', onUpdate: () => new Date() },
};

export const VendorSchema = new EntitySchema<any>({
  name: 'Vendor',
  tableName: 'vendors',
  schema: 'app',
  properties: {
    ...baseProps,
    code: { type: 'string', unique: true },
    name: { type: 'string' },
    status: { type: 'string', default: 'ACTIVE' },
  },
});

export const PartnerSchema = new EntitySchema<any>({
  name: 'Partner',
  tableName: 'partners',
  schema: 'app',
  properties: {
    ...baseProps,
    vendor: { kind: 'm:1', entity: () => 'Vendor' as any },
    code: { type: 'string', unique: true },
    name: { type: 'string' },
    businessNo: { type: 'string', nullable: true },
    contactEmail: { type: 'string', nullable: true },
    contactPhone: { type: 'string', nullable: true },
    status: { type: 'string', default: 'ACTIVE' },
  },
});

export const ServiceSchema = new EntitySchema<any>({
  name: 'Service',
  tableName: 'services',
  schema: 'app',
  properties: {
    ...baseProps,
    vendor: { kind: 'm:1', entity: () => 'Vendor' as any },
    code: { type: 'string', unique: true },
    name: { type: 'string' },
    description: { type: 'text', nullable: true },
    status: { type: 'enum', items: Object.values(ServiceStatus), default: ServiceStatus.DRAFT },
    createdBy: { type: 'uuid', nullable: true },
  },
});

export const PartnerSubscriptionSchema = new EntitySchema<any>({
  name: 'PartnerSubscription',
  tableName: 'partner_subscriptions',
  schema: 'app',
  uniques: [{ properties: ['partner', 'service'] }],
  properties: {
    ...baseProps,
    partner: { kind: 'm:1', entity: () => 'Partner' as any },
    service: { kind: 'm:1', entity: () => 'Service' as any },
    status: { type: 'enum', items: Object.values(SubscriptionStatus), default: SubscriptionStatus.TRIAL },
    planCode: { type: 'string', nullable: true },
    startedAt: { type: 'datetime', columnType: 'timestamptz', nullable: true },
    endedAt: { type: 'datetime', columnType: 'timestamptz', nullable: true },
  },
});

export const AdminUserSchema = new EntitySchema<any>({
  name: 'AdminUser',
  tableName: 'admin_users',
  schema: 'app',
  properties: {
    ...baseProps,
    vendor: { kind: 'm:1', entity: () => 'Vendor' as any, nullable: true },
    partner: { kind: 'm:1', entity: () => 'Partner' as any, nullable: true },
    role: { type: 'enum', items: Object.values(AdminRole) },
    email: { type: 'string', unique: true },
    passwordHash: { type: 'string' },
    name: { type: 'string' },
    isActive: { type: 'boolean', default: true },
    lastLoginAt: { type: 'datetime', columnType: 'timestamptz', nullable: true },
  },
});

export const CustomerSchema = new EntitySchema<any>({
  name: 'Customer',
  tableName: 'customers',
  schema: 'app',
  uniques: [{ properties: ['partner', 'email'] }],
  properties: {
    ...baseProps,
    partner: { kind: 'm:1', entity: () => 'Partner' as any },
    email: { type: 'string' },
    passwordHash: { type: 'string', nullable: true },
    name: { type: 'string' },
    phone: { type: 'string', nullable: true },
    isActive: { type: 'boolean', default: true },
    lastLoginAt: { type: 'datetime', columnType: 'timestamptz', nullable: true },
  },
});

export const CustomerAuthAccountSchema = new EntitySchema<any>({
  name: 'CustomerAuthAccount',
  tableName: 'customer_auth_accounts',
  schema: 'app',
  uniques: [
    { properties: ['provider', 'providerUserId'] },
    { properties: ['customer', 'provider'] },
  ],
  properties: {
    ...baseProps,
    customer: { kind: 'm:1', entity: () => 'Customer' as any },
    provider: { type: 'enum', items: Object.values(AuthProvider) },
    providerUserId: { type: 'string' },
    providerEmail: { type: 'string', nullable: true },
  },
});

export const RefreshTokenSchema = new EntitySchema<any>({
  name: 'RefreshToken',
  tableName: 'refresh_tokens',
  schema: 'app',
  properties: {
    ...baseProps,
    userType: { type: 'string' },
    userId: { type: 'uuid' },
    tokenHash: { type: 'string', unique: true },
    expiresAt: { type: 'datetime', columnType: 'timestamptz' },
    revokedAt: { type: 'datetime', columnType: 'timestamptz', nullable: true },
  },
});

export const AuditLogSchema = new EntitySchema<any>({
  name: 'AuditLog',
  tableName: 'audit_logs',
  schema: 'app',
  properties: {
    id: { type: 'number', primary: true, autoincrement: true },
    actorType: { type: 'string' },
    actorId: { type: 'uuid', nullable: true },
    partnerId: { type: 'uuid', nullable: true },
    vendorId: { type: 'uuid', nullable: true },
    action: { type: 'string' },
    resourceType: { type: 'string' },
    resourceId: { type: 'string', nullable: true },
    beforeData: { type: 'json', nullable: true },
    afterData: { type: 'json', nullable: true },
    ipAddress: { type: 'string', nullable: true },
    userAgent: { type: 'text', nullable: true },
    createdAt: { type: 'datetime', columnType: 'timestamptz', defaultRaw: 'now()' },
  },
});

export const entities = [
  VendorSchema,
  PartnerSchema,
  ServiceSchema,
  PartnerSubscriptionSchema,
  AdminUserSchema,
  CustomerSchema,
  CustomerAuthAccountSchema,
  RefreshTokenSchema,
  AuditLogSchema,
];
