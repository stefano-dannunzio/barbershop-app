import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL es obligatoria. Configura una URL de PostgreSQL para iniciar la aplicación.');
}
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
export const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET ?? ADMIN_PASSWORD;
const adminEvents = new Set<express.Response>();

app.use(cors());
app.use(express.json());

function createAdminToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 1000 * 60 * 60 * 8 })).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function isValidAdminToken(token: string | undefined) {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? queryToken;
  if (!isValidAdminToken(token)) return res.status(401).json({ message: 'Sesión de administrador requerida.' });
  return next();
}

function notifyAdmin(event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of adminEvents) client.write(message);
}

function generateCancelCode() {
  return `BAR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function formatSummaryDay(date: Date) {
  const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date);  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/services', async (_req, res) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'No se pudieron cargar los servicios.' });
  }
});

app.post('/api/services', requireAdmin, async (req, res) => {
  const { name, description, price, duration, isAvailable } = req.body as {
    name?: string;
    description?: string;
    price?: number;
    duration?: number;
    isAvailable?: boolean;
  };

  if (!name || !price || !duration) {
    return res.status(400).json({ message: 'Faltan datos del servicio.' });
  }

  try {
    const service = await prisma.service.create({
      data: {
        name,
        description: description ?? '',
        price: Number(price),
        duration: Number(duration),
        isAvailable: Boolean(isAvailable ?? true),
      },
    });

    return res.status(201).json(service);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'No se pudo crear el servicio.' });
  }
});

app.put('/api/services/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const { name, description, price, duration, isAvailable } = req.body as {
    name?: string;
    description?: string;
    price?: number;
    duration?: number;
    isAvailable?: boolean;
  };

  try {
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(duration !== undefined ? { duration: Number(duration) } : {}),
        ...(isAvailable !== undefined ? { isAvailable } : {}),
      },
    });

    return res.json(service);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'No se pudo actualizar el servicio.' });
  }
});

app.delete('/api/services/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);

  try {
    await prisma.service.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'No se pudo eliminar el servicio.' });
  }
});

app.get('/api/barbers', requireAdmin, async (_req, res) => {
  try {
    const barbers = await prisma.barber.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(barbers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'No se pudieron cargar los barberos.' });
  }
});

app.post('/api/barbers', requireAdmin, async (req, res) => {
  const { name, specialty, isActive } = req.body as {
    name?: string;
    specialty?: string;
    isActive?: boolean;
  };

  if (!name) {
    return res.status(400).json({ message: 'El nombre del barbero es obligatorio.' });
  }

  try {
    const barber = await prisma.barber.create({
      data: {
        name,
        specialty: specialty ?? '',
        isActive: Boolean(isActive ?? true),
      },
    });

    return res.status(201).json(barber);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'No se pudo crear el barbero.' });
  }
});

app.put('/api/barbers/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const { name, specialty, isActive } = req.body as {
    name?: string;
    specialty?: string;
    isActive?: boolean;
  };

  try {
    const barber = await prisma.barber.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(specialty !== undefined ? { specialty } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return res.json(barber);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'No se pudo actualizar el barbero.' });
  }
});

app.delete('/api/barbers/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);

  try {
    await prisma.barber.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'No se pudo eliminar el barbero.' });
  }
});

app.get('/api/bookings', requireAdmin, async (_req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { service: true, barber: true },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'No se pudieron cargar las reservas.' });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { serviceId, scheduledAt, customerName, customerPhone, barberId, barberName } = req.body as {
    serviceId?: string;
    scheduledAt?: string;
    customerName?: string;
    customerPhone?: string;
    barberId?: string;
    barberName?: string;
  };

  if (!serviceId || !scheduledAt || !customerName) {
    return res.status(400).json({ message: 'Faltan datos para confirmar la reserva.' });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return res.status(404).json({ message: 'El servicio no existe.' });
  }

  if (!service.isAvailable) {
    return res.status(400).json({ message: 'Este servicio no está disponible en este momento.' });
  }

  const proposedDate = new Date(scheduledAt);
  if (Number.isNaN(proposedDate.getTime())) {
    return res.status(400).json({ message: 'La fecha de la reserva no es válida.' });
  }

  const existing = await prisma.booking.findFirst({
    where: {
      serviceId,
      scheduledAt: proposedDate,
      status: { not: 'cancelled' },
    },
  });

  if (existing) {
    return res.status(409).json({ message: 'Ese horario ya está reservado.' });
  }

  const selectedBarber = barberId ? await prisma.barber.findUnique({ where: { id: barberId } }) : null;

  const booking = await prisma.booking.create({
    data: {
      serviceId,
      scheduledAt: proposedDate,
      customerName,
      customerPhone: customerPhone ?? '',
      barberName: selectedBarber?.name ?? barberName ?? null,
      barberId: selectedBarber?.id ?? null,
      cancelCode: generateCancelCode(),
      status: 'confirmed',
    },
    include: { service: true, barber: true },
  });

  notifyAdmin('booking-created', booking);
  return res.status(201).json({ cancelCode: booking.cancelCode, booking });
});

app.put('/api/bookings/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const { barberId, barberName, status } = req.body as { barberId?: string | null; barberName?: string; status?: string };

  try {
    const selectedBarber = barberId ? await prisma.barber.findUnique({ where: { id: barberId } }) : null;
    const finalBarberName = selectedBarber?.name ?? (barberId === null || barberId === '' ? 'Sin asignar' : barberName ?? null);

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(barberId !== undefined ? { barberId: barberId || null } : {}),
        barberName: finalBarberName,
        ...(status !== undefined ? { status } : {}),
      },
      include: { service: true, barber: true },
    });

    notifyAdmin('booking-updated', booking);
    return res.json(booking);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'No se pudo guardar la reserva.' });
  }
});

app.post('/api/bookings/:id/cancel', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const { cancelCode } = req.body as { cancelCode?: string };

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return res.status(404).json({ message: 'No existe esa reserva.' });
  }

  if (booking.cancelCode !== cancelCode) {
    return res.status(400).json({ message: 'El código de cancelación es incorrecto.' });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: 'cancelled' },
    include: { service: true },
  });

  notifyAdmin('booking-updated', updated);
  return res.json(updated);
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body as { password?: string };

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Credenciales incorrectas.' });
  }

  return res.json({ ok: true, token: createAdminToken() });
});

app.get('/api/admin/summary', requireAdmin, async (_req, res) => {
  try {
    const [services, bookings] = await Promise.all([
      prisma.service.findMany(),
      prisma.booking.findMany({ include: { service: true }, orderBy: { scheduledAt: 'asc' } }),
    ]) as [Array<{ isAvailable: boolean }>, Array<{ status: string; scheduledAt: Date | string; service: { price: number } | null }>];

    const totalRevenue = bookings
      .filter((booking: { status: string }) => booking.status !== 'cancelled')
      .reduce<number>((sum: number, booking: { service: { price: number } | null }) => sum + (booking.service?.price ?? 0), 0);

    const revenueByDay = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);
      date.setHours(0, 0, 0, 0);

      const total = bookings
        .filter((booking: { status: string }) => booking.status !== 'cancelled')
        .filter((booking: { scheduledAt: Date | string }) => {
          const slot = new Date(booking.scheduledAt);
          return slot.toDateString() === date.toDateString();
        })
        .reduce<number>((sum: number, booking: { service: { price: number } | null }) => sum + (booking.service?.price ?? 0), 0);

      return {
        day: formatSummaryDay(date),
        total,
      };
    });

    const upcomingBookings = bookings.filter((booking: { scheduledAt: Date | string; status: string }) => new Date(booking.scheduledAt) >= new Date() && booking.status !== 'cancelled').length;

    res.json({
      totalRevenue,
      totalBookings: bookings.length,
      activeServices: services.filter((service) => service.isAvailable).length,
      upcomingBookings,
      revenueByDay,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'No se pudieron cargar los datos del panel.' });
  }
});

app.get('/api/admin/events', requireAdmin, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
  res.write('event: connected\ndata: {}\n\n');
  adminEvents.add(res);
  req.on('close', () => adminEvents.delete(res));
});

const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    return res.sendFile(path.join(distDir, 'index.html'));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => console.log(`Barbershop API running on http://localhost:${PORT}`));
}
