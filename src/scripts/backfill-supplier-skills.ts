/**
 * One-off script that AI-drafts skills for every supplier whose skill list
 * is still empty, then re-embeds them so the new skills reach semantic
 * search.
 *
 * Run with: `npm run prisma:skills`
 *
 * New and edited suppliers get drafted automatically (see
 * SupplierService.refreshSearchData) — this covers the catalogue that
 * existed before skills did. Safe to re-run: suppliers that already have
 * skills, including ones they wrote themselves, are never touched.
 *
 * Env: needs at least one chat model key (ANTHROPIC_API_KEY, OPENAI_API_KEY
 *      or GEMINI_API_KEY); the re-embed also needs OPENAI_API_KEY.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '../app.module';
import { SupplierService } from '../api/supplier/supplier.service';
import { PrismaService } from '../shared/datasource/prisma/prisma.service';

async function main() {
  const logger = new Logger('backfill-supplier-skills');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const suppliers = app.get(SupplierService);

  const rows = await prisma.supplier.findMany({
    where: { deletedAt: null, skills: { isEmpty: true } },
    select: { supplierId: true, companyName: true },
    orderBy: { supplierId: 'asc' },
  });

  if (rows.length === 0) {
    logger.log('Nothing to draft — every supplier already has skills.');
    await app.close();
    return;
  }

  logger.log(`Drafting skills for ${rows.length} supplier(s)…`);

  // Sequential on purpose: each draft is a model call, and a burst of
  // parallel ones trips provider rate limits for no real speed-up at
  // catalogue sizes we have.
  let drafted = 0;
  for (const { supplierId, companyName } of rows) {
    await suppliers.refreshSearchData(supplierId);
    const { skills } = await prisma.supplier.findUniqueOrThrow({
      where: { supplierId },
      select: { skills: true },
    });
    if (skills.length > 0) drafted++;
    logger.log(`#${supplierId} ${companyName}: ${skills.join(', ') || '(none — profile too thin)'}`);
  }

  logger.log(`Done. ${drafted}/${rows.length} supplier(s) got skills.`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
