/**
 * Adds a single test supplier — "Piki Tiki" — with 3 services across 4 cities.
 * Idempotent: safe to re-run.
 *
 * Run:  cd dne-backend && npx ts-node prisma/seed-piki-tiki.ts
 * Login: supplier@supplier.com  /  test1234
 */
import { PricingModel, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const EMAIL = 'supplier@supplier.com';
const PASSWORD = 'test1234';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ─── Make sure the categories exist (they're created by the base seed) ───
  const ensureCategory = async (slug: string, name: string, es: string, en: string) => {
    const existing = await prisma.category.findUnique({ where: { slug } });
    return (
      existing ??
      (await prisma.category.create({
        data: { slug, categoryName: name, nameEs: es, nameEn: en, active: true, displayOrder: 0 },
      }))
    );
  };
  const catering = await ensureCategory('catering', 'Catering', 'Catering', 'Catering');
  const musicDj = await ensureCategory('music-dj', 'Music & DJ', 'Música y DJ', 'Music & DJ');

  // ─── User ────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      email: EMAIL,
      password: passwordHash,
      name: 'Piki Tiki Owner',
      phone: '+50688999000',
      country: 'CR',
      role: Role.SUPPLIER,
      isCustomer: false,
      isSupplier: true,
      firstName: 'Piki',
      lastName: 'Tiki',
    },
  });

  // ─── Supplier ────────────────────────────────────────────────────────────
  const existingSupplier = await prisma.supplier.findUnique({ where: { userId: user.userId } });
  const supplier =
    existingSupplier ??
    (await prisma.supplier.create({
      data: {
        userId: user.userId,
        companyName: 'Piki Tiki',
        slug: 'piki-tiki',
        tagline: 'Tropical-themed events that vibe',
        description:
          'Full-service tropical event company — Hawaiian-style catering, beach DJ sets, tiki bars, and event decoration. Perfect for birthdays, retirement parties, and corporate luaus.',
        businessEmail: EMAIL,
        businessPhone: '+50688999000',
        whatsappNumber: '+50688999000',
        city: 'Santa Ana',
        minCapacity: 10,
        maxCapacity: 150,
        rating: 4.8,
        reviewCount: 89,
        responseTimeMinutes: 12,
        verified: true,
        premium: false,
      },
    }));

  // ─── Categories the supplier serves ──────────────────────────────────────
  await prisma.supplierCategory.upsert({
    where: { supplierId_categoryId: { supplierId: supplier.supplierId, categoryId: catering.categoryId } },
    update: {},
    create: { supplierId: supplier.supplierId, categoryId: catering.categoryId, isPrimary: true },
  });
  await prisma.supplierCategory.upsert({
    where: { supplierId_categoryId: { supplierId: supplier.supplierId, categoryId: musicDj.categoryId } },
    update: {},
    create: { supplierId: supplier.supplierId, categoryId: musicDj.categoryId, isPrimary: false },
  });

  // ─── Service areas (which cities they'll go to) ──────────────────────────
  for (const city of ['Santa Ana', 'Escazú', 'San José', 'Heredia']) {
    await prisma.supplierServiceArea.upsert({
      where: { supplierId_city: { supplierId: supplier.supplierId, city } },
      update: {},
      create: { supplierId: supplier.supplierId, city, radiusKm: 30 },
    });
  }

  // ─── Services ────────────────────────────────────────────────────────────
  const services = [
    {
      categoryId: catering.categoryId,
      name: 'Tropical Catering Buffet',
      description:
        'Hawaiian-style buffet for events. Includes mains, sides, fruit displays, and tropical drinks. Per-person pricing.',
      pricingModel: PricingModel.PER_PERSON,
      basePrice: 18000,
      minUnits: 10,
      maxUnits: 150,
      unitLabel: 'guests',
    },
    {
      categoryId: musicDj.categoryId,
      name: 'Beach DJ Set + Sound System',
      description: '4-hour DJ set with tropical and reggaeton mix, professional sound system, basic lighting.',
      pricingModel: PricingModel.FLAT,
      basePrice: 180000,
    },
    {
      categoryId: catering.categoryId,
      name: 'Tiki Bar Setup',
      description: 'Full tiki bar service — bartender, tropical cocktails, themed decor. 4-hour service.',
      pricingModel: PricingModel.FLAT,
      basePrice: 120000,
    },
  ];

  for (const s of services) {
    const existing = await prisma.service.findFirst({
      where: { supplierId: supplier.supplierId, name: s.name },
    });
    if (!existing) {
      await prisma.service.create({
        data: {
          supplierId: supplier.supplierId,
          categoryId: s.categoryId,
          name: s.name,
          description: s.description,
          pricingModel: s.pricingModel,
          basePrice: s.basePrice,
          currency: 'CRC',
          minUnits: s.minUnits ?? null,
          maxUnits: s.maxUnits ?? null,
          unitLabel: s.unitLabel ?? null,
        },
      });
    }
  }

  console.log('\n────────────────────────────────────────────────');
  console.log('Piki Tiki seeded.');
  console.log(`  login email: ${EMAIL}`);
  console.log(`  login password: ${PASSWORD}`);
  console.log(`  userId:     ${user.userId}`);
  console.log(`  supplierId: ${supplier.supplierId}`);
  console.log('  services:   3 (catering buffet, DJ set, tiki bar)');
  console.log('  cities:     Santa Ana, Escazú, San José, Heredia');
  console.log('────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
