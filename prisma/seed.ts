import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatoria para ejecutar el seed.');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const services = [
  {
    name: 'Corte clásico',
    description: 'Corte de precisión con recorte y acabado premium.',
    price: 3200,
    duration: 45,
    isAvailable: true,
  },
  {
    name: 'Barba completa',
    description: 'Recorte, perfilado y cuidado con toalla caliente.',
    price: 2800,
    duration: 30,
    isAvailable: true,
  },
  {
    name: 'Combo corte + barba',
    description: 'Servicio completo para un look impecable y cuidado profesional.',
    price: 5200,
    duration: 70,
    isAvailable: true,
  },
  {
    name: 'Afeitado premium',
    description: 'Afeitado con navaja, limpieza y aromatización premium.',
    price: 2600,
    duration: 25,
    isAvailable: false,
  },
];

const barbers = [
  { name: 'Mateo', specialty: 'Corte clásico y perfilado', isActive: true },
  { name: 'Alberto', specialty: 'Barba y estilo moderno', isActive: true },
  { name: 'Rafael', specialty: 'Afeitado premium', isActive: true },
];

async function main() {
  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });

    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: service,
      });
      continue;
    }

    await prisma.service.create({ data: service });
  }

  for (const barber of barbers) {
    const existing = await prisma.barber.findFirst({ where: { name: barber.name } });

    if (existing) {
      await prisma.barber.update({
        where: { id: existing.id },
        data: barber,
      });
      continue;
    }

    await prisma.barber.create({ data: barber });
  }

  console.log('Servicios y barberos de prueba cargados.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
