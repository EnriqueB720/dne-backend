/**
 * Populates the marketplace with a broad, realistic set of suppliers across
 * many categories and Costa Rican cities — so AI search has real DB inventory
 * to match against instead of falling back to AI-invented providers.
 *
 * Idempotent: every write is an upsert / find-or-create, so it's safe to
 * re-run as many times as you like.
 *
 * Run:  cd dne-backend && npx ts-node prisma/seed-marketplace.ts
 *   (or, after wiring the script below) npm run prisma:seed:marketplace
 *
 * Login for every seeded supplier: <email> / test1234
 */
import { PrismaClient, PricingModel, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = 'test1234';

// ── Category catalog ────────────────────────────────────────────────────────
const CATEGORY_DEFS = [
  { slug: 'catering', categoryName: 'Catering', nameEs: 'Catering', nameEn: 'Catering' },
  { slug: 'photography', categoryName: 'Photography', nameEs: 'Fotografía', nameEn: 'Photography' },
  { slug: 'music-dj', categoryName: 'Music & DJ', nameEs: 'Música y DJ', nameEn: 'Music & DJ' },
  { slug: 'cleaning', categoryName: 'Cleaning', nameEs: 'Limpieza', nameEn: 'Cleaning' },
  { slug: 'ac-repair', categoryName: 'AC Repair', nameEs: 'Reparación de A/C', nameEn: 'AC Repair' },
  { slug: 'bakery', categoryName: 'Bakery & Cakes', nameEs: 'Pastelería', nameEn: 'Bakery & Cakes' },
  { slug: 'decor', categoryName: 'Event Decor', nameEs: 'Decoración de Eventos', nameEn: 'Event Decor' },
  { slug: 'moving', categoryName: 'Moving & Logistics', nameEs: 'Mudanzas', nameEn: 'Moving & Logistics' },
];

// ── Supplier inventory ──────────────────────────────────────────────────────
// `serviceAreas` are the cities the supplier will travel to — keep them honest
// so location-filtered search stays meaningful.
interface ServiceDef {
  categorySlug: string;
  name: string;
  description: string;
  pricingModel: PricingModel;
  basePrice: number;
  minUnits?: number;
  maxUnits?: number;
  unitLabel?: string;
}

interface SupplierDef {
  email: string;
  ownerName: string;
  phone: string;
  companyName: string;
  slug: string;
  city: string;
  serviceAreas: string[];
  tagline: string;
  description: string;
  primaryCategorySlug: string;
  extraCategorySlugs?: string[];
  minCapacity?: number;
  maxCapacity?: number;
  rating: number;
  reviewCount: number;
  responseTimeMinutes: number;
  verified: boolean;
  premium: boolean;
  websiteUrl?: string;
  services: ServiceDef[];
}

const SUPPLIERS: SupplierDef[] = [
  // ── Catering ──────────────────────────────────────────────────────────────
  {
    email: 'gourmet.catering@solvo.test',
    ownerName: 'Andrea Rojas',
    phone: '+50622451001',
    companyName: 'Catering Gourmet CR',
    slug: 'catering-gourmet-cr',
    city: 'Alajuela',
    serviceAreas: ['Alajuela', 'Heredia', 'San José'],
    tagline: 'Cocina de autor para cada evento',
    description:
      'Full-service gourmet catering for weddings, corporate events and private parties. Custom menus, professional wait staff, full setup and teardown.',
    primaryCategorySlug: 'catering',
    minCapacity: 20,
    maxCapacity: 300,
    rating: 4.9,
    reviewCount: 214,
    responseTimeMinutes: 8,
    verified: true,
    premium: true,
    websiteUrl: 'https://cateringgourmet.cr',
    services: [
      {
        categorySlug: 'catering',
        name: 'Wedding Catering Package',
        description: 'Three-course plated menu, full service, linens and wait staff.',
        pricingModel: PricingModel.PER_PERSON,
        basePrice: 27000,
        minUnits: 20,
        maxUnits: 300,
        unitLabel: 'guests',
      },
      {
        categorySlug: 'catering',
        name: 'Corporate Lunch Buffet',
        description: 'Hot & cold buffet for office events, delivered and set up.',
        pricingModel: PricingModel.PER_PERSON,
        basePrice: 9500,
        minUnits: 15,
        maxUnits: 200,
        unitLabel: 'guests',
      },
    ],
  },
  {
    email: 'eventos.valle@solvo.test',
    ownerName: 'Marco Jiménez',
    phone: '+50625512002',
    companyName: 'Eventos del Valle',
    slug: 'eventos-del-valle',
    city: 'Cartago',
    serviceAreas: ['Cartago', 'San José', 'Curridabat'],
    tagline: 'Sabor casero, servicio impecable',
    description:
      'Affordable catering for birthdays, quinceañeras and family gatherings. Buffet style with traditional Costa Rican dishes.',
    primaryCategorySlug: 'catering',
    minCapacity: 15,
    maxCapacity: 150,
    rating: 4.6,
    reviewCount: 132,
    responseTimeMinutes: 22,
    verified: true,
    premium: false,
    services: [
      {
        categorySlug: 'catering',
        name: 'Birthday Buffet',
        description: 'Casado-style buffet, two mains, sides, dessert and drinks.',
        pricingModel: PricingModel.PER_PERSON,
        basePrice: 6800,
        minUnits: 15,
        maxUnits: 150,
        unitLabel: 'guests',
      },
    ],
  },

  // ── Music & DJ ────────────────────────────────────────────────────────────
  {
    email: 'dj.carlosmix@solvo.test',
    ownerName: 'Carlos Mora',
    phone: '+50624413356',
    companyName: 'DJ Carlos Mix',
    slug: 'dj-carlos-mix',
    city: 'Alajuela',
    serviceAreas: ['Alajuela', 'Heredia', 'San José'],
    tagline: 'La fiesta no para',
    description:
      'Professional DJ for weddings, birthdays and corporate events. Pro sound system, lighting setup, custom playlists and MC service.',
    primaryCategorySlug: 'music-dj',
    rating: 4.7,
    reviewCount: 215,
    responseTimeMinutes: 10,
    verified: true,
    premium: false,
    websiteUrl: 'https://djcarlosmix.cr',
    services: [
      {
        categorySlug: 'music-dj',
        name: 'Full Event DJ Package',
        description: '5-hour DJ set, professional sound system, lighting rig, MC service.',
        pricingModel: PricingModel.FLAT,
        basePrice: 250000,
      },
      {
        categorySlug: 'music-dj',
        name: 'Basic Party DJ',
        description: '3-hour DJ set with sound system and basic lights.',
        pricingModel: PricingModel.FLAT,
        basePrice: 145000,
      },
    ],
  },
  {
    email: 'dj.mauricio@solvo.test',
    ownerName: 'Mauricio Vargas',
    phone: '+50687342156',
    companyName: 'DJ Mauricio Sound System',
    slug: 'dj-mauricio-sound-system',
    city: 'San José',
    serviceAreas: ['San José', 'Curridabat', 'Escazú', 'Heredia'],
    tagline: 'Sonido profesional, energía total',
    description:
      'Wedding and event DJ with 12 years of experience. Premium sound, intelligent lighting, fog machine and bilingual MC.',
    primaryCategorySlug: 'music-dj',
    rating: 4.8,
    reviewCount: 342,
    responseTimeMinutes: 12,
    verified: true,
    premium: true,
    services: [
      {
        categorySlug: 'music-dj',
        name: 'Premium Wedding DJ',
        description: '6-hour set, premium sound + intelligent lighting, fog machine, bilingual MC.',
        pricingModel: PricingModel.FLAT,
        basePrice: 385000,
      },
    ],
  },
  {
    email: 'proevents.dj@solvo.test',
    ownerName: 'Esteban Solano',
    phone: '+50622345678',
    companyName: 'Pro Events DJ Costa Rica',
    slug: 'pro-events-dj-cr',
    city: 'Escazú',
    serviceAreas: ['Escazú', 'Santa Ana', 'San José'],
    tagline: 'Eventos que se recuerdan',
    description:
      'Corporate and private event DJ with full production capability — staging, lighting design and event coordination.',
    primaryCategorySlug: 'music-dj',
    rating: 4.7,
    reviewCount: 289,
    responseTimeMinutes: 9,
    verified: true,
    premium: false,
    services: [
      {
        categorySlug: 'music-dj',
        name: 'Production DJ Package',
        description: '5-hour coverage, professional equipment, lighting package, event coordination.',
        pricingModel: PricingModel.FLAT,
        basePrice: 220000,
      },
    ],
  },

  // ── Photography ───────────────────────────────────────────────────────────
  {
    email: 'lente.magico@solvo.test',
    ownerName: 'Valeria Castro',
    phone: '+50624419911',
    companyName: 'Lente Mágico Fotografía',
    slug: 'lente-magico',
    city: 'Heredia',
    serviceAreas: ['Heredia', 'San José', 'Alajuela'],
    tagline: 'Momentos que duran para siempre',
    description:
      'Event and portrait photography. Weddings, quinceañeras, newborn and corporate headshots. Edited gallery delivered in 7 days.',
    primaryCategorySlug: 'photography',
    rating: 4.9,
    reviewCount: 178,
    responseTimeMinutes: 15,
    verified: true,
    premium: false,
    services: [
      {
        categorySlug: 'photography',
        name: 'Wedding Photography (8h)',
        description: 'Full-day coverage, two photographers, 400+ edited photos, online gallery.',
        pricingModel: PricingModel.FLAT,
        basePrice: 420000,
      },
      {
        categorySlug: 'photography',
        name: 'Event Photography (4h)',
        description: 'Half-day event coverage, edited photos delivered in 7 days.',
        pricingModel: PricingModel.FLAT,
        basePrice: 165000,
      },
    ],
  },
  {
    email: 'captura.studio@solvo.test',
    ownerName: 'Diego Herrera',
    phone: '+50622778090',
    companyName: 'Captura Studio',
    slug: 'captura-studio',
    city: 'San José',
    serviceAreas: ['San José', 'Curridabat', 'Escazú'],
    tagline: 'Fotografía con estilo editorial',
    description:
      'Editorial-style event and brand photography. Specializing in corporate events, product shoots and social media content.',
    primaryCategorySlug: 'photography',
    rating: 4.6,
    reviewCount: 96,
    responseTimeMinutes: 30,
    verified: false,
    premium: false,
    services: [
      {
        categorySlug: 'photography',
        name: 'Corporate Event Coverage',
        description: '3-hour corporate coverage, same-week edited delivery.',
        pricingModel: PricingModel.FLAT,
        basePrice: 135000,
      },
    ],
  },

  // ── Cleaning ──────────────────────────────────────────────────────────────
  {
    email: 'limpieza.total@solvo.test',
    ownerName: 'Patricia Núñez',
    phone: '+50622334455',
    companyName: 'Limpieza Total CR',
    slug: 'limpieza-total-cr',
    city: 'San José',
    serviceAreas: ['San José', 'Curridabat', 'Escazú', 'Santa Ana'],
    tagline: 'Tu espacio, impecable',
    description:
      'Residential and office cleaning. Deep cleaning, post-construction, move-in/move-out and recurring weekly service.',
    primaryCategorySlug: 'cleaning',
    rating: 4.7,
    reviewCount: 251,
    responseTimeMinutes: 18,
    verified: true,
    premium: false,
    services: [
      {
        categorySlug: 'cleaning',
        name: 'Deep Home Cleaning',
        description: 'Top-to-bottom deep clean for homes up to 3 bedrooms.',
        pricingModel: PricingModel.FLAT,
        basePrice: 38000,
      },
      {
        categorySlug: 'cleaning',
        name: 'Recurring Weekly Cleaning',
        description: 'Weekly maintenance cleaning, supplies included.',
        pricingModel: PricingModel.PER_HOUR,
        basePrice: 6500,
        unitLabel: 'hours',
      },
    ],
  },
  {
    email: 'ecoclean@solvo.test',
    ownerName: 'Laura Méndez',
    phone: '+50622990011',
    companyName: 'EcoClean Servicios',
    slug: 'ecoclean-servicios',
    city: 'Heredia',
    serviceAreas: ['Heredia', 'Alajuela', 'San José'],
    tagline: 'Limpieza profunda, productos eco',
    description:
      'Eco-friendly cleaning service using biodegradable products. Homes, offices and Airbnb turnover cleaning.',
    primaryCategorySlug: 'cleaning',
    rating: 4.8,
    reviewCount: 143,
    responseTimeMinutes: 25,
    verified: true,
    premium: false,
    services: [
      {
        categorySlug: 'cleaning',
        name: 'Airbnb Turnover Clean',
        description: 'Fast turnover cleaning between guests, linens and restock.',
        pricingModel: PricingModel.FLAT,
        basePrice: 22000,
      },
    ],
  },

  // ── AC Repair ─────────────────────────────────────────────────────────────
  {
    email: 'frioexperto@solvo.test',
    ownerName: 'Roberto Salas',
    phone: '+50624412233',
    companyName: 'FríoExperto AC',
    slug: 'frioexperto-ac',
    city: 'Alajuela',
    serviceAreas: ['Alajuela', 'Heredia', 'San José'],
    tagline: 'Tu confort es nuestra misión',
    description:
      'AC installation, repair and maintenance for residential and commercial units. Same-day emergency service available.',
    primaryCategorySlug: 'ac-repair',
    rating: 4.8,
    reviewCount: 187,
    responseTimeMinutes: 14,
    verified: true,
    premium: false,
    services: [
      {
        categorySlug: 'ac-repair',
        name: 'AC Diagnostic & Repair',
        description: 'On-site diagnostic plus standard repair (parts billed separately).',
        pricingModel: PricingModel.FLAT,
        basePrice: 35000,
      },
      {
        categorySlug: 'ac-repair',
        name: 'AC Maintenance Service',
        description: 'Full cleaning, gas check and filter service per unit.',
        pricingModel: PricingModel.FLAT,
        basePrice: 25000,
      },
    ],
  },
  {
    email: 'climatizacion.tica@solvo.test',
    ownerName: 'Gabriela Pérez',
    phone: '+50622887766',
    companyName: 'Climatización Tica',
    slug: 'climatizacion-tica',
    city: 'San José',
    serviceAreas: ['San José', 'Curridabat', 'Cartago'],
    tagline: 'Instalación y servicio garantizado',
    description:
      'Specialists in mini-split installation and commercial HVAC. Certified technicians, 1-year warranty on all work.',
    primaryCategorySlug: 'ac-repair',
    rating: 4.6,
    reviewCount: 109,
    responseTimeMinutes: 35,
    verified: true,
    premium: false,
    services: [
      {
        categorySlug: 'ac-repair',
        name: 'Mini-Split Installation',
        description: 'Supply and install of a residential mini-split unit, with warranty.',
        pricingModel: PricingModel.FLAT,
        basePrice: 165000,
      },
    ],
  },

  // ── Bakery & Cakes ────────────────────────────────────────────────────────
  {
    email: 'dulce.hogar@solvo.test',
    ownerName: 'Carmen Ulloa',
    phone: '+50625510099',
    companyName: 'Dulce Hogar Bakery',
    slug: 'dulce-hogar-bakery',
    city: 'Cartago',
    serviceAreas: ['Cartago', 'San José', 'Curridabat'],
    tagline: 'Pasteles que enamoran',
    description:
      'Custom cakes and dessert tables for weddings, birthdays and corporate events. Gluten-free and vegan options available.',
    primaryCategorySlug: 'bakery',
    rating: 4.9,
    reviewCount: 167,
    responseTimeMinutes: 20,
    verified: true,
    premium: false,
    services: [
      {
        categorySlug: 'bakery',
        name: 'Custom Tiered Cake',
        description: '3-tier custom cake, your design, serves up to 60.',
        pricingModel: PricingModel.FLAT,
        basePrice: 45000,
      },
      {
        categorySlug: 'bakery',
        name: 'Dessert Table',
        description: 'Assorted dessert table — cupcakes, mini pastries, cake pops.',
        pricingModel: PricingModel.PER_PERSON,
        basePrice: 3200,
        minUnits: 20,
        maxUnits: 200,
        unitLabel: 'guests',
      },
    ],
  },
  {
    email: 'pasteleria.angelina@solvo.test',
    ownerName: 'Angelina Mata',
    phone: '+50622445588',
    companyName: 'Pastelería Angelina',
    slug: 'pasteleria-angelina',
    city: 'San José',
    serviceAreas: ['San José', 'Escazú', 'Santa Ana'],
    tagline: 'Tradición repostera desde 1998',
    description:
      'Classic European-style bakery. Wedding cakes, artisan breads and event catering desserts.',
    primaryCategorySlug: 'bakery',
    rating: 4.7,
    reviewCount: 203,
    responseTimeMinutes: 28,
    verified: true,
    premium: false,
    services: [
      {
        categorySlug: 'bakery',
        name: 'Wedding Cake',
        description: 'Custom multi-tier wedding cake with tasting session included.',
        pricingModel: PricingModel.FLAT,
        basePrice: 85000,
      },
    ],
  },

  // ── Event Decor ───────────────────────────────────────────────────────────
  {
    email: 'decoraciones.fiesta@solvo.test',
    ownerName: 'Natalia Quesada',
    phone: '+50622660033',
    companyName: 'Decoraciones Fiesta CR',
    slug: 'decoraciones-fiesta-cr',
    city: 'Escazú',
    serviceAreas: ['Escazú', 'Santa Ana', 'San José', 'Heredia'],
    tagline: 'Transformamos tu evento',
    description:
      'Full event styling and decor — balloon arches, floral arrangements, backdrops, table settings and themed setups.',
    primaryCategorySlug: 'decor',
    rating: 4.8,
    reviewCount: 156,
    responseTimeMinutes: 16,
    verified: true,
    premium: true,
    services: [
      {
        categorySlug: 'decor',
        name: 'Full Event Styling',
        description: 'Complete styling — backdrop, florals, balloons, table decor.',
        pricingModel: PricingModel.FLAT,
        basePrice: 95000,
      },
      {
        categorySlug: 'decor',
        name: 'Balloon Arch & Backdrop',
        description: 'Custom balloon arch with photo backdrop for parties.',
        pricingModel: PricingModel.FLAT,
        basePrice: 38000,
      },
    ],
  },

  // ── Moving & Logistics ────────────────────────────────────────────────────
  {
    email: 'mudanzas.express@solvo.test',
    ownerName: 'Fernando Aguilar',
    phone: '+50622119988',
    companyName: 'Mudanzas Express',
    slug: 'mudanzas-express',
    city: 'San José',
    serviceAreas: ['San José', 'Heredia', 'Alajuela', 'Cartago', 'Curridabat'],
    tagline: 'Tu mudanza sin estrés',
    description:
      'Residential and office moving service. Packing, loading, transport and assembly. Insured cargo, careful crew.',
    primaryCategorySlug: 'moving',
    rating: 4.5,
    reviewCount: 312,
    responseTimeMinutes: 40,
    verified: true,
    premium: false,
    services: [
      {
        categorySlug: 'moving',
        name: 'Apartment Move (1-2 BR)',
        description: 'Crew of 3, truck, basic packing materials, up to 30 km.',
        pricingModel: PricingModel.FLAT,
        basePrice: 75000,
      },
      {
        categorySlug: 'moving',
        name: 'Office Relocation',
        description: 'Full office move — packing, transport, reassembly.',
        pricingModel: PricingModel.PER_HOUR,
        basePrice: 18000,
        unitLabel: 'hours',
      },
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ─── Categories ───────────────────────────────────────────────────────────
  const categoryIdBySlug: Record<string, number> = {};
  for (const c of CATEGORY_DEFS) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    const cat =
      existing ??
      (await prisma.category.create({
        data: { ...c, active: true, displayOrder: 0 },
      }));
    categoryIdBySlug[c.slug] = cat.categoryId;
  }

  // ─── Suppliers ────────────────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;

  for (const s of SUPPLIERS) {
    const owner = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: passwordHash,
        name: s.ownerName,
        phone: s.phone,
        country: 'CR',
        role: Role.SUPPLIER,
        isCustomer: false,
        isSupplier: true,
        firstName: s.ownerName.split(' ')[0],
        lastName: s.ownerName.split(' ').slice(1).join(' '),
      },
    });

    const existingSupplier = await prisma.supplier.findUnique({
      where: { userId: owner.userId },
    });

    const supplier =
      existingSupplier ??
      (await prisma.supplier.create({
        data: {
          userId: owner.userId,
          companyName: s.companyName,
          slug: s.slug,
          tagline: s.tagline,
          description: s.description,
          city: s.city,
          businessEmail: s.email,
          businessPhone: s.phone,
          whatsappNumber: s.phone,
          websiteUrl: s.websiteUrl ?? null,
          minCapacity: s.minCapacity ?? null,
          maxCapacity: s.maxCapacity ?? null,
          rating: s.rating,
          reviewCount: s.reviewCount,
          responseTimeMinutes: s.responseTimeMinutes,
          verified: s.verified,
          premium: s.premium,
        },
      }));

    if (existingSupplier) skipped++;
    else created++;

    // Category junctions
    const allCategorySlugs = [
      s.primaryCategorySlug,
      ...(s.extraCategorySlugs ?? []),
    ];
    for (let idx = 0; idx < allCategorySlugs.length; idx++) {
      const categoryId = categoryIdBySlug[allCategorySlugs[idx]];
      if (categoryId == null) continue;
      await prisma.supplierCategory.upsert({
        where: {
          supplierId_categoryId: { supplierId: supplier.supplierId, categoryId },
        },
        update: {},
        create: {
          supplierId: supplier.supplierId,
          categoryId,
          isPrimary: idx === 0,
        },
      });
    }

    // Service areas
    for (const city of s.serviceAreas) {
      await prisma.supplierServiceArea.upsert({
        where: {
          supplierId_city: { supplierId: supplier.supplierId, city },
        },
        update: {},
        create: { supplierId: supplier.supplierId, city, radiusKm: 30 },
      });
    }

    // Services
    for (const svc of s.services) {
      const categoryId = categoryIdBySlug[svc.categorySlug];
      if (categoryId == null) continue;
      const existingService = await prisma.service.findFirst({
        where: { supplierId: supplier.supplierId, name: svc.name },
      });
      if (!existingService) {
        await prisma.service.create({
          data: {
            supplierId: supplier.supplierId,
            categoryId,
            name: svc.name,
            description: svc.description,
            pricingModel: svc.pricingModel,
            basePrice: svc.basePrice,
            currency: 'CRC',
            minUnits: svc.minUnits ?? null,
            maxUnits: svc.maxUnits ?? null,
            unitLabel: svc.unitLabel ?? null,
            tags: [],
            inclusions: [],
          },
        });
      }
    }
  }

  console.log('\n────────────────────────────────────────────────────────');
  console.log('Marketplace seed complete.');
  console.log(`  suppliers created: ${created}`);
  console.log(`  suppliers already existed (skipped): ${skipped}`);
  console.log(`  categories ensured: ${CATEGORY_DEFS.length}`);
  console.log(`  login password for all: ${PASSWORD}`);
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
