/**
 * One-off script that embeds every supplier missing a
 * `descriptionEmbedding` and writes the vector back to Postgres.
 *
 * Run with: `npx ts-node src/scripts/backfill-supplier-embeddings.ts`
 *
 * Env: needs `OPENAI_API_KEY` (same one ChatModule uses). Safe to re-run
 *      — it filters to NULL embeddings, so only touches new/failed rows.
 *      Flip `FORCE_ALL=true` to re-embed everything (e.g. after a model
 *      switch).
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '../app.module';
import { EmbeddingService } from '../api/embedding/embedding.service';
import { buildSupplierEmbeddingText } from '../api/supplier/supplier-embedding.text';
import { PrismaService } from '../shared/datasource/prisma/prisma.service';

async function main() {
  const logger = new Logger('backfill-supplier-embeddings');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const embedding = app.get(EmbeddingService);
  const prisma = app.get(PrismaService);

  if (!embedding.isEnabled()) {
    logger.error('OPENAI_API_KEY is missing — aborting');
    await app.close();
    process.exit(1);
  }

  const forceAll = process.env.FORCE_ALL === 'true';

  // Read the id list via raw SQL because Prisma's TS types don't expose
  // the `Unsupported("vector(...)")` column at all — including in WHERE.
  const rows = await prisma.$queryRawUnsafe<{ supplier_id: number }[]>(
    forceAll
      ? 'SELECT supplier_id FROM supplier WHERE deleted_at IS NULL ORDER BY supplier_id;'
      : 'SELECT supplier_id FROM supplier WHERE deleted_at IS NULL AND description_embedding IS NULL ORDER BY supplier_id;',
  );

  if (rows.length === 0) {
    logger.log('Nothing to embed — every supplier already has a vector.');
    await app.close();
    return;
  }

  logger.log(`Embedding ${rows.length} supplier(s)…`);

  const suppliers = await prisma.supplier.findMany({
    where: { supplierId: { in: rows.map((r) => r.supplier_id) } },
    select: {
      supplierId: true,
      companyName: true,
      tagline: true,
      description: true,
      services: { select: { name: true, description: true } },
      categories: { select: { category: { select: { categoryName: true } } } },
    },
  });

  const texts = suppliers.map(buildSupplierEmbeddingText);
  const vectors = await embedding.embedBatch(texts);

  // Write vectors back one at a time — pgvector's text format is fine
  // for row counts we care about here (dozens, not millions), and it
  // avoids fighting Prisma's typed API for the Unsupported column.
  for (let i = 0; i < suppliers.length; i++) {
    const literal = EmbeddingService.toVectorLiteral(vectors[i]);
    await prisma.$executeRawUnsafe(
      'UPDATE supplier SET description_embedding = $1::vector WHERE supplier_id = $2',
      literal,
      suppliers[i].supplierId,
    );
  }

  logger.log(`✅ Embedded ${suppliers.length} supplier(s).`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
