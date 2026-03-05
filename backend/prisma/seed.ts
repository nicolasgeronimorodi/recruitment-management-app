import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ── Countries ──
  const countries = [
    'Argentina',
    'Brasil',
    'Chile',
    'Colombia',
    'México',
    'Perú',
    'Uruguay',
  ];

  for (const name of countries) {
    await prisma.country.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`Seeded ${countries.length} countries`);

  // ── Fields ──
  const fields = [
    'Tecnología',
    'Finanzas',
    'Salud',
    'Educación',
    'Industria manufacturera',
    'Retail',
    'Energía',
  ];

  for (const name of fields) {
    await prisma.field.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`Seeded ${fields.length} fields`);

  // ── Initial Recruiting Officer ──
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@recruiting.com' },
    update: {},
    create: {
      email: 'admin@recruiting.com',
      password: hashedPassword,
      name: 'Admin Officer',
      role: Role.RECRUITING_OFFICER,
    },
  });

  console.log('Seeded initial RecruitingOfficer: admin@recruiting.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });