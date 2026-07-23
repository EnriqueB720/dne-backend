/**
 * One-off script that creates (or promotes) the platform admin user. Safe
 * to run multiple times — uses upsert so a re-run just refreshes the flags
 * on an existing row instead of erroring.
 *
 * Run with: `npx ts-node prisma/seed-admin.ts`
 *
 * Override the defaults via env vars:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=strongpass npx ts-node prisma/seed-admin.ts
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@solvo.local';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin1234';
// User.name is @unique, so we derive it from the email local-part when
// the operator doesn't provide one — guarantees uniqueness across re-runs
// and lets multiple admin seeds coexist (`admin@`, `owner@`, etc).
const NAME = process.env.ADMIN_NAME ?? `Admin (${EMAIL.split('@')[0]})`;

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    // On re-run: always re-assert the admin flags so a demoted account
    // gets promoted back. Password is untouched to avoid clobbering a
    // rotation the operator did elsewhere.
    update: {
      role: Role.ADMIN,
      isAdmin: true,
    },
    create: {
      email: EMAIL,
      password: passwordHash,
      name: NAME,
      country: 'CR',
      role: Role.ADMIN,
      isAdmin: true,
      isCustomer: false,
      isSupplier: false,
      firstName: NAME,
    },
  });

  console.log(
    `✅ Admin ready — userId=${user.userId} email=${user.email} role=${user.role} isAdmin=${user.isAdmin}`,
  );
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`   default password: ${PASSWORD}  (change via ADMIN_PASSWORD env)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
