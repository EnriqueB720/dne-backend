import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminTotals {
  @Field(() => Int) suppliers: number;
  @Field(() => Int) verifiedSuppliers: number;
  /** Suppliers still waiting for an admin to verify them. */
  @Field(() => Int) pendingVerification: number;
  @Field(() => Int) preferredSuppliers: number;
  @Field(() => Int) customers: number;
  @Field(() => Int) newSuppliers: number;
  @Field(() => Int) newCustomers: number;
  /** Customer → supplier contacts in the window. */
  @Field(() => Int) contacts: number;
  /** Distinct people (signed-in customers + guest devices) who contacted someone. */
  @Field(() => Int) uniqueContacters: number;
  @Field(() => Int) chats: number;
}

@ObjectType()
export class AdminDailyRow {
  /** YYYY-MM-DD (UTC). */
  @Field() day: string;
  @Field(() => Int) newSuppliers: number;
  @Field(() => Int) newCustomers: number;
  @Field(() => Int) contacts: number;
}

@ObjectType()
export class AdminCount {
  @Field() key: string;
  @Field() label: string;
  @Field(() => Int) count: number;
}

@ObjectType()
export class AdminTopSupplier {
  @Field(() => Int) supplierId: number;
  @Field() companyName: string;
  @Field({ nullable: true }) provinceName?: string;
  @Field(() => Int) contacts: number;
  @Field(() => String, { nullable: true }) rating?: string;
}

@ObjectType()
export class AdminOverview {
  @Field(() => Int) days: number;
  @Field(() => AdminTotals) totals: AdminTotals;
  @Field(() => [AdminDailyRow]) daily: AdminDailyRow[];
  @Field(() => [AdminCount]) contactsByChannel: AdminCount[];
  @Field(() => [AdminCount]) suppliersByProvince: AdminCount[];
  @Field(() => [AdminTopSupplier]) topSuppliers: AdminTopSupplier[];
}

/** One supplier as the admin tables show it (includes the owner's login email). */
@ObjectType()
export class AdminSupplierRow {
  @Field(() => Int) supplierId: number;
  @Field() companyName: string;
  @Field({ nullable: true }) tagline?: string;
  @Field({ nullable: true }) description?: string;
  @Field({ nullable: true }) city?: string;
  @Field({ nullable: true }) province?: string;
  @Field({ nullable: true }) provinceName?: string;
  @Field(() => [String]) categories: string[];
  @Field({ nullable: true }) businessPhone?: string;
  @Field({ nullable: true }) whatsappNumber?: string;
  @Field({ nullable: true }) businessEmail?: string;
  @Field({ nullable: true }) websiteUrl?: string;
  @Field() ownerName: string;
  @Field() ownerEmail: string;
  @Field() source: string;
  @Field({ nullable: true }) verifiedAt?: Date;
  @Field({ nullable: true }) preferredAt?: Date;
  @Field({ nullable: true }) preferredUntil?: Date;
  /** preferredAt set and not expired. */
  @Field() preferred: boolean;
  @Field(() => String, { nullable: true }) rating?: string;
  @Field(() => Int) reviewCount: number;
  @Field(() => Int) contactsLast30Days: number;
  @Field() createdAt: Date;
}

@ObjectType()
export class AdminSupplierPage {
  @Field(() => [AdminSupplierRow]) rows: AdminSupplierRow[];
  @Field(() => Int) total: number;
}
