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

## 3. Publicar el Frontend en GitHub Pages

Dado que GitHub Pages solo aloja archivos estáticos (HTML/JS/CSS), debes tener la API del backend desplegada previamente (por ejemplo en Vercel o Render).

### Pasos para configurar GitHub Pages:

1. **Subí el código a GitHub**:
   ```bash
   git add .
   git commit -m "Configurar despliegue para GitHub Pages"
   git push origin main
   ```

2. **Habilitá GitHub Actions para Pages**:
   - En tu repositorio de GitHub, ve a **Settings → Pages**.
   - En **Build and deployment → Source**, selecciona **GitHub Actions**.

3. **Configurá la URL de la API (opcional)**:
   - Si tu API está desplegada en Vercel/Render, ve a **Settings → Secrets and variables → Actions**.
   - En la pestaña **Variables** (o **Secrets**), crea una variable llamada `VITE_API_URL` con la URL de tu API (ejemplo: `https://tu-barbershop-api.vercel.app`).

4. **Despliegue automático**:
   - Cada vez que hagas `push` a la rama `main` o `master`, la GitHub Action `.github/workflows/deploy.yml` compilará y publicará la aplicación automáticamente en `https://<tu-usuario>.github.io/<tu-repositorio>/`.

## Actualización de reservas

Mientras el panel está abierto, se conecta a un stream de eventos del servidor. Una reserva, cancelación o cambio de barbero actualiza la lista y las métricas inmediatamente. También existe una actualización de respaldo cada 20 segundos para recuperarse de conexiones móviles interrumpidas.
