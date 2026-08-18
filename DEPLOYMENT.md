# Deploy gratuito: Vercel + Neon

Esta demo queda preparada para PostgreSQL. La recomendación es desplegar el frontend y API en Vercel, y crear la base de datos en Neon. Vercel ya no ofrece Postgres propio para proyectos nuevos; Neon ofrece una base PostgreSQL gratuita que se suspende cuando no está en uso.

## 1. Crear la base de datos

1. Creá un proyecto gratuito en Neon y copiá la cadena de conexión **pooled** con SSL.
2. Copiá `.env.example` a `.env` y reemplazá los valores. No subas `.env` al repositorio.
3. Aplicá el esquema y los datos de demo:

```bash
npm run db:migrate:deploy
npm run db:seed
```

## 2. Publicar en Vercel

1. Importá el repositorio en Vercel.
2. En **Settings → Environment Variables**, agregá `DATABASE_URL`, `ADMIN_PASSWORD` y `ADMIN_TOKEN_SECRET` con los mismos valores de tu `.env`.
3. Desplegá. `vercel.json` genera el cliente y el build de Vite; `api/index.ts` expone la API.

El panel ya no está enlazado desde la interfaz pública: se accede directamente en `https://tu-dominio/#gestion-privada`.

## Actualización de reservas

Mientras el panel está abierto, se conecta a un stream de eventos del servidor. Una reserva, cancelación o cambio de barbero actualiza la lista y las métricas inmediatamente. También existe una actualización de respaldo cada 20 segundos para recuperarse de conexiones móviles interrumpidas.
