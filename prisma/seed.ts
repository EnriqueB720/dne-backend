import { PrismaClient, PricingModel, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = 'test1234';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ─── Pricing plan (suppliers will eventually subscribe to this) ─────
  const existingPlan = await prisma.pricingPlan.findFirst({ where: { slug: 'free' } });
  const plan =
    existingPlan ??
    (await prisma.pricingPlan.create({
      data: {
        planName: 'Free',
        price: 0,
        features: 'Basic listing',
        slug: 'free',
        description: 'Free tier for testing',
        priceMonthly: 0,
        priceYearly: 0,
        active: true,
      },
    }));

  // ─── Categories ─────────────────────────────────────────────────────
  const categoryDefs = [
    { slug: 'catering',    categoryName: 'Catering',    nameEs: 'Catering',     nameEn: 'Catering' },
    { slug: 'photography', categoryName: 'Photography', nameEs: 'Fotografía',   nameEn: 'Photography' },
    { slug: 'music-dj',    categoryName: 'Music & DJ',  nameEs: 'Música y DJ',  nameEn: 'Music & DJ' },
  ];

  const categories: Record<string, number> = {};
  for (const c of categoryDefs) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    const cat =
      existing ??
      (await prisma.category.create({
        data: { ...c, active: true, displayOrder: 0 },
      }));
    categories[c.slug] = cat.categoryId;
  }

  // ─── Customer user + Customer profile ──────────────────────────────
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@solvo.test' },
    update: {},
    create: {
      email: 'customer@solvo.test',
      password: passwordHash,
      name: 'Maria Test',
      phone: '+50688880001',
      country: 'CR',
      role: Role.SUPPLIER, // legacy single-role field; multi-role flags below are the real source of truth
      isCustomer: true,
      isSupplier: false,
      firstName: 'Maria',
      lastName: 'Test',
    },
  });

  const customer = await prisma.customer.upsert({
    where: { userId: customerUser.userId },
    update: {},
    create: {
      userId: customerUser.userId,
      defaultCity: 'Santa Ana',
    },
  });

  // ─── Suppliers (3) with services, areas, category junctions ────────
  const supplierDefs = [
    {
      email: 'sabor@solvo.test',
      name: 'Sabor Catering Owner',
      phone: '+50688880002',
      companyName: 'Sabor Catering Co.',
      slug: 'sabor-catering',
      city: 'Santa Ana',
      description: 'Full-service catering for events of all sizes',
      tagline: 'Eventos memorables, sabor casero',
      categorySlug: 'catering',
      service: {
        name: 'Wedding Catering Package',
        description: 'Three-course menu, full service for up to 100 guests',
        pricingModel: PricingModel.PER_PERSON,
        basePrice: 25000,
      },
    },
    {
      email: 'mesa@solvo.test',
      name: 'Mesa Fina Owner',
      phone: '+50688880003',
      companyName: 'Mesa Fina Eventos',
      slug: 'mesa-fina',
      city: 'Escazú',
      description: 'Premium catering with linen, decor and wait staff',
      tagline: 'Catering boutique',
      categorySlug: 'catering',
      service: {
        name: 'Premium Catering',
        description: 'Premium menu with dessert table, wait staff and decor',
        pricingModel: PricingModel.FLAT,
        basePrice: 320000,
      },
    },
    {
      email: 'studioluz@solvo.test',
      name: 'Studio Luz Owner',
      phone: '+50688880004',
      companyName: 'Studio Luz Photography',
      slug: 'studio-luz',
      city: 'San José',
      description: 'Award-winning event and portrait photography',
      tagline: 'Capturing light, stories, moments',
      categorySlug: 'photography',
      service: {
        name: 'Event Photography (4h)',
        description: 'Full event coverage with edited photos delivered in 7 days',
        pricingModel: PricingModel.FLAT,
        basePrice: 180000,
      },
    },
  ];

  const createdSuppliers: Array<{ companyName: string; supplierId: number; email: string }> = [];

  for (const s of supplierDefs) {
    const supplierUser = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: passwordHash,
        name: s.name,
        phone: s.phone,
        country: 'CR',
        role: Role.SUPPLIER,
        isCustomer: false,
        isSupplier: true,
        firstName: s.name.split(' ')[0],
        lastName: s.name.split(' ').slice(1).join(' '),
      },
    });

    const existingSupplier = await prisma.supplier.findUnique({ where: { userId: supplierUser.userId } });
    const supplier =
      existingSupplier ??
      (await prisma.supplier.create({
        data: {
          userId: supplierUser.userId,
          companyName: s.companyName,
          slug: s.slug,
          tagline: s.tagline,
          description: s.description,
          city: s.city,
          businessEmail: s.email,
          businessPhone: s.phone,
          whatsappNumber: s.phone,
        },
      }));

    await prisma.supplierServiceArea.upsert({
      where: { supplierId_city: { supplierId: supplier.supplierId, city: s.city } },
      update: {},
      create: { supplierId: supplier.supplierId, city: s.city, radiusKm: 30 },
    });

    await prisma.supplierCategory.upsert({
      where: {
        supplierId_categoryId: {
          supplierId: supplier.supplierId,
          categoryId: categories[s.categorySlug],
        },
      },
      update: {},
      create: {
        supplierId: supplier.supplierId,
        categoryId: categories[s.categorySlug],
        isPrimary: true,
      },
    });

    const existingService = await prisma.service.findFirst({
      where: { supplierId: supplier.supplierId, name: s.service.name },
    });
    if (!existingService) {
      await prisma.service.create({
        data: {
          supplierId: supplier.supplierId,
          categoryId: categories[s.categorySlug],
          name: s.service.name,
          description: s.service.description,
          pricingModel: s.service.pricingModel,
          basePrice: s.service.basePrice,
          currency: 'CRC',
        },
      });
    }

    createdSuppliers.push({
      companyName: s.companyName,
      supplierId: supplier.supplierId,
      email: s.email,
    });
  }

  // ─── Report ────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────────────────────');
  console.log('Seed complete.\n');
  console.log(`Password for ALL users: ${PASSWORD}\n`);
  console.log('CUSTOMER (paste customerId on /requests):');
  console.log(`  email:      customer@solvo.test`);
  console.log(`  userId:     ${customerUser.userId}`);
  console.log(`  customerId: ${customer.customerId}`);
  console.log('\nSUPPLIERS (paste supplierId on /quotes):');
  for (const sup of createdSuppliers) {
    console.log(`  ${sup.companyName}`);
    console.log(`    email:      ${sup.email}`);
    console.log(`    supplierId: ${sup.supplierId}`);
  }
  console.log('\nCATEGORIES (optional categoryId on createRequest):');
  for (const slug of Object.keys(categories)) {
    console.log(`  ${slug.padEnd(12)} ${categories[slug]}`);
  }
  console.log(`\nPRICING PLAN: planId=${plan.planId} (${plan.planName})`);
  console.log('────────────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
