/**
 * Fills `supplier.province` / `service_provinces` for suppliers that have
 * none yet — mainly rows imported by dne-scraper (Google Places), which
 * only know a city and coordinates.
 *
 * Run with: `npm run geo:backfill`   (add `-- --dry-run` to only print)
 *
 * Resolution per supplier: coordinates (nearest known place) → city →
 * address. Suppliers that still don't resolve are listed so an admin can
 * fix them by hand. Safe to re-run: rows that already have a province are
 * never touched.
 */
import { PrismaClient } from '@prisma/client';

import { GeoService } from '../shared/geo/geo.service';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaClient();
  const geo = new GeoService();

  const rows = await prisma.supplier.findMany({
    where: { deletedAt: null, province: null },
    select: { supplierId: true, companyName: true, city: true, address: true, lat: true, lng: true, serviceProvinces: true },
  });

  let fixed = 0;
  const unresolved: string[] = [];
  for (const s of rows) {
    const province =
      (s.lat != null && s.lng != null ? geo.fromCoordinates(Number(s.lat), Number(s.lng)) : null) ??
      (s.city ? geo.fromText(s.city) : null) ??
      (s.address ? geo.fromText(s.address) : null);

    if (!province) {
      unresolved.push(`#${s.supplierId} ${s.companyName} (city: ${s.city ?? '—'})`);
      continue;
    }
    fixed++;
    console.log(`#${s.supplierId} ${s.companyName} → ${province}`);
    if (!dryRun) {
      await prisma.supplier.update({
        where: { supplierId: s.supplierId },
        data: { province, serviceProvinces: geo.normalizeServiceProvinces(province, s.serviceProvinces) },
      });
    }
  }

  console.log(`\n${dryRun ? '[dry run] ' : ''}${fixed} resolved, ${unresolved.length} unresolved.`);
  if (unresolved.length) console.log('Unresolved (set province by hand):\n  ' + unresolved.join('\n  '));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
