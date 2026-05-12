/**
 * Standalone test of the supplier search logic — bypasses GraphQL entirely.
 *
 * Run:  cd dne-backend && npx ts-node prisma/test-search.ts
 *
 * Expected: Piki Tiki shows up in the results.
 * If it does → the search logic is fine; the bug is between GraphQL ↔ frontend.
 * If it doesn't → the data isn't in the shape we expect (or there's a filter issue).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run(label: string, where: any) {
  const results = await prisma.supplier.findMany({
    where,
    select: {
      supplierId: true,
      companyName: true,
      city: true,
      verified: true,
      deletedAt: true,
      services: { select: { name: true } },
      categories: { select: { category: { select: { slug: true } } } },
      serviceAreas: { select: { city: true } },
    },
  });
  console.log(`\n── ${label} — ${results.length} match(es) ──`);
  results.forEach((s) => {
    console.log(`  ${s.companyName} (#${s.supplierId})`);
    console.log(`    city: ${s.city}, verified: ${s.verified}, deletedAt: ${s.deletedAt}`);
    console.log(`    services: ${s.services.map((x: any) => x.name).join(', ')}`);
    console.log(`    cats: ${s.categories.map((x: any) => x.category.slug).join(', ')}`);
    console.log(`    areas: ${s.serviceAreas.map((x: any) => x.city).join(', ')}`);
  });
}

async function main() {
  // Test 1 — does Piki Tiki exist at all?
  await run('All suppliers named Piki', {
    companyName: { contains: 'Piki', mode: 'insensitive' },
  });

  // Test 2 — same filters the search uses for "DJ" in "Santa Ana"
  await run('"DJ" in "Santa Ana"', {
    deletedAt: null,
    AND: [
      {
        OR: [
          { city: { contains: 'Santa Ana', mode: 'insensitive' } },
          { serviceAreas: { some: { city: { contains: 'Santa Ana', mode: 'insensitive' } } } },
        ],
      },
      {
        OR: [
          { companyName: { contains: 'DJ', mode: 'insensitive' } },
          { tagline: { contains: 'DJ', mode: 'insensitive' } },
          { description: { contains: 'DJ', mode: 'insensitive' } },
          { services: { some: { name: { contains: 'DJ', mode: 'insensitive' } } } },
          { services: { some: { description: { contains: 'DJ', mode: 'insensitive' } } } },
          {
            categories: {
              some: {
                category: {
                  OR: [
                    { categoryName: { contains: 'DJ', mode: 'insensitive' } },
                    { nameEs: { contains: 'DJ', mode: 'insensitive' } },
                    { nameEn: { contains: 'DJ', mode: 'insensitive' } },
                    { slug: { contains: 'dj', mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        ],
      },
    ],
  });

  // Test 3 — service-only "DJ" (no city), to see if city filter is the problem
  await run('"DJ" service-only (no city filter)', {
    deletedAt: null,
    OR: [
      { services: { some: { name: { contains: 'DJ', mode: 'insensitive' } } } },
      { description: { contains: 'DJ', mode: 'insensitive' } },
      { categories: { some: { category: { slug: { contains: 'dj', mode: 'insensitive' } } } } },
    ],
  });

  // Test 4 — city-only "Santa Ana"
  await run('"Santa Ana" city-only (no service filter)', {
    deletedAt: null,
    OR: [
      { city: { contains: 'Santa Ana', mode: 'insensitive' } },
      { serviceAreas: { some: { city: { contains: 'Santa Ana', mode: 'insensitive' } } } },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
