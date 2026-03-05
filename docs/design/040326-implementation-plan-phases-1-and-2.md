# Implementation Plan — Phases 1 & 2

**Date:** 04/03/2026
**Status:** Phase 1 complete — Phase 2 blocked (port conflict, see Phase 2 Milestone)
**Related:** [Tech Stack & Structure](./040326-tech-stack-and-structure.md)

---

## Phase 1 — Project Scaffolding & Infrastructure

### Step 1: Scaffold Projects

Run from the root (`candidate-management-app/`):

```bash
# Backend - NestJS
npx @nestjs/cli new backend --package-manager npm --strict

# Frontend - Next.js
# When prompted: TypeScript=Yes, ESLint=Yes, Tailwind=Yes, src/=Yes, App Router=Yes, import alias=@/*, React Compiler=No
npx create-next-app@latest frontend

# After scaffold, install shadcn/ui
cd frontend
npx shadcn@latest init
# Style: New York, Base color: Neutral (or your preference)
cd ..
```

---

### Step 2: Environment Files

#### `.env` (root)

```env
# PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=recruiting_db
POSTGRES_USER=recruiting_user
POSTGRES_PASSWORD=recruiting_pass

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=cv-uploads

# Backend
DATABASE_URL=postgresql://recruiting_user:recruiting_pass@postgres:5432/recruiting_db
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRATION=1h

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### `.env.example` (root)

```env
# PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=recruiting_db
POSTGRES_USER=
POSTGRES_PASSWORD=

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=cv-uploads

# Backend
DATABASE_URL=postgresql://<user>:<password>@postgres:5432/recruiting_db
JWT_SECRET=
JWT_EXPIRATION=1h

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

### Step 3: Dockerfiles

#### `backend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Prisma necesita OpenSSL para su query engine — Alpine no lo incluye por defecto
RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
```

> **Importante — orden de dependencias entre comandos Prisma y el Dockerfile:**
>
> `RUN npx prisma generate` en el Dockerfile **requiere** que ya exista `prisma/schema.prisma` en el proyecto. Por eso falló la primera vez: el archivo no existía todavía cuando se intentó hacer el build.
>
> El orden correcto es:
> 1. (Phase 2) Instalar Prisma y ejecutar `prisma init` → crea `prisma/schema.prisma`
> 2. (Phase 2) Escribir el schema en ese archivo
> 3. Recién ahí, `docker compose up --build` puede ejecutar `RUN npx prisma generate` sin errores
>
> En la primera ejecución de Phase 1 esta línea fue removida temporalmente para poder verificar que los contenedores levantaban. **Ahora que el schema existe (Phase 2 Step 2), debe volver a estar en el Dockerfile** antes de continuar con Step 4.

#### `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
```

---

### Step 4: Docker Compose

#### `docker-compose.yml` (root)

```yaml
# Nota: 'version' está deprecado en Docker Compose V2+ y puede generar un warning.
# Se puede remover sin efectos. Se mantiene por compatibilidad con documentación existente.
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: recruiting-postgres
    env_file: .env
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    container_name: recruiting-minio
    env_file: .env
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ['CMD', 'mc', 'ready', 'local']
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: recruiting-backend
    env_file: .env
    ports:
      - '3000:3000'
    volumes:
      - ./backend/src:/app/src
      - ./backend/prisma:/app/prisma
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: recruiting-frontend
    env_file: .env
    ports:
      - '3001:3000'
    volumes:
      - ./frontend/src:/app/src
    depends_on:
      - backend

volumes:
  postgres_data:
  minio_data:
```

> **Note:** Next.js runs on port 3000 inside the container, mapped to 3001 on host to avoid conflict with backend.

---

### Phase 1 Milestone

Run `docker compose up --build` and verify:

- [ ] PostgreSQL is healthy on port 5432
- [ ] MinIO console accessible at http://localhost:9001
- [ ] Backend responds at http://localhost:3000
- [ ] Frontend loads at http://localhost:3001

---

## Phase 2 — Database Schema & Seed

> **Mapa mental de los comandos Prisma — leerlo antes de ejecutar cualquier comando:**
>
> | Comando | Qué hace | Cuándo se usa |
> |---|---|---|
> | `prisma init` | Crea la carpeta `prisma/` con un `schema.prisma` vacío y agrega `DATABASE_URL` al `.env`. Solo scaffolding, no toca la DB. | Una sola vez, al inicio |
> | `prisma generate` | Lee `schema.prisma` y genera el **Prisma Client** (código TypeScript tipado) en `node_modules/@prisma/client`. Sin esto, no podés importar `PrismaClient` en el código. | Cada vez que cambiás el schema |
> | `prisma migrate dev` | Lee `schema.prisma`, calcula la diferencia con la DB, genera un archivo SQL de migración en `prisma/migrations/`, lo aplica a la DB, y ejecuta `prisma generate` automáticamente. | Cada vez que cambiás el schema en desarrollo |
> | `prisma db seed` | Ejecuta el script `prisma/seed.ts` para poblar la DB con datos iniciales. No toca la estructura de tablas. | Cuando querés insertar datos base |
> | `prisma studio` | Abre una UI web para explorar y editar la DB visualmente. | Para verificar datos en desarrollo |
>
> **Relación con el Dockerfile:** `RUN npx prisma generate` en el Dockerfile hace lo mismo que el comando manual, pero al momento de construir la imagen Docker. Necesita que `schema.prisma` ya exista en el proyecto (que es por eso que falló en Phase 1 antes de que Prisma estuviera instalado).

### Step 1: Install Prisma

> **Versión de Prisma:** Usamos **Prisma 5** (no la última versión). Prisma 7 introdujo breaking changes en cómo se declara la conexión a la DB (`datasource url` se movió a un archivo `prisma.config.ts` separado), y el ecosistema NestJS todavía no tiene soporte estable para ella. Prisma 5 es la versión con mayor documentación, tutoriales, y compatibilidad con NestJS.
>
> **Si previamente instalaste Prisma 7** (sin especificar versión), necesitás hacer el downgrade y limpiar los residuos antes de continuar:
> ```bash
> cd backend
> npm uninstall prisma @prisma/client
> npm install prisma@^5 --save-dev
> npm install @prisma/client@^5
> # Borrar prisma.config.ts — es un archivo de Prisma 7, no existe en Prisma 5
> rm prisma.config.ts
> # Borrar la carpeta prisma/ generada por Prisma 7 (se va a recrear con prisma init)
> rm -rf prisma/
> ```

Run inside `backend/`:

```bash
cd backend
npm install prisma@^5 --save-dev
npm install @prisma/client@^5
npx prisma init
```

> `prisma init` crea la carpeta `prisma/` con un `schema.prisma` vacío. Si ya existía una carpeta `prisma/` (por algún run previo), borrala antes de ejecutar este comando. El comando también agrega la variable `DATABASE_URL` al `.env` del backend — como ya la tenemos definida en el `.env` de la raíz, podés ignorar ese cambio o sincronizarlo.

Replace the entire content of the generated `schema.prisma` with the schema below.

---

### Step 2: Prisma Schema

#### `backend/prisma/schema.prisma`

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── IAM Context ──

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(RECRUITING_OFFICER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

enum Role {
  RECRUITING_OFFICER
}

// ── Recruitment Context ──

model Country {
  id        String    @id @default(uuid())
  name      String    @unique
  companies Company[]

  @@map("countries")
}

model Field {
  id        String    @id @default(uuid())
  name      String    @unique
  companies Company[]

  @@map("fields")
}

model Company {
  id              String           @id @default(uuid())
  name            String
  countryId       String
  country         Country          @relation(fields: [countryId], references: [id])
  fields          Field[]
  jobDescriptions JobDescription[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@map("companies")
}

model JobDescription {
  id           String               @id @default(uuid())
  title        String
  description  String
  requirements String?
  status       JobDescriptionStatus @default(DRAFT)
  companyId    String
  company      Company              @relation(fields: [companyId], references: [id])
  applications JobApplication[]
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt

  @@map("job_descriptions")
}

enum JobDescriptionStatus {
  DRAFT
  PUBLISHED
  CANCELED
}

model Applicant {
  id           String           @id @default(uuid())
  email        String           @unique
  name         String
  phone        String?
  cvPath       String?
  applications JobApplication[]
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@map("applicants")
}

model JobApplication {
  id               String            @id @default(uuid())
  status           ApplicationStatus @default(RECEIVED)
  jobDescriptionId String
  jobDescription   JobDescription    @relation(fields: [jobDescriptionId], references: [id])
  applicantId      String
  applicant        Applicant         @relation(fields: [applicantId], references: [id])
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@unique([jobDescriptionId, applicantId])
  @@map("job_applications")
}

enum ApplicationStatus {
  RECEIVED
  UNDER_REVIEW
  ACCEPTED
  REJECTED
}
```

> **Key:** `@@unique([jobDescriptionId, applicantId])` enforces the business rule "one application per applicant per job description" at the database level.

> **binaryTargets en el generator:** Prisma compila un "query engine" binario específico para cada plataforma. `"native"` genera para tu máquina local (Windows) y `"linux-musl-openssl-3.0.x"` genera para Alpine Linux (el contenedor Docker). Sin ambos targets, Prisma funciona en uno de los dos entornos pero falla en el otro.

Después de escribir el schema, generá el Prisma Client localmente para que el IDE reconozca los tipos (enums como `Role`, modelos como `User`, etc.):

```bash
# Desde backend/
npx prisma generate
```

> Esto genera el Prisma Client en `node_modules/@prisma/client` con tipos TypeScript para todos los modelos y enums del schema. Sin este paso, el IDE marca errores como `Module '@prisma/client' has no exported member 'Role'`.

---

### Step 3: Seed Script

#### Install dependencies

```bash
npm install bcrypt
npm install --save-dev @types/bcrypt ts-node
```

#### Add seed config to `backend/package.json`

Add this block at the root level of `package.json`:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

> **Cuidado con el typo:** El valor debe ser `"ts-node prisma/seed.ts"` con guión. Si se escribe `"ts node"` (con espacio), `prisma db seed` falla silenciosamente porque no encuentra el ejecutable `ts`.

#### `backend/prisma/seed.ts`

```typescript
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
    'Technology',
    'Finance',
    'Healthcare',
    'Education',
    'Manufacturing',
    'Retail',
    'Energy',
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
```

---

### Step 4: Restore Dockerfile & Run Migration & Seed

> Antes de continuar, verificá que `backend/Dockerfile` tenga la línea `RUN npx prisma generate` restaurada (fue removida temporalmente en Phase 1). El schema ya existe, así que ahora puede ejecutarse sin errores.

Rebuild y levantá los contenedores:

```bash
# Desde la raíz del proyecto
docker compose up --build
```

Con los contenedores corriendo, en otra terminal ejecutá la migración y el seed:

```bash
# Crea las tablas en la DB (genera el SQL y lo aplica)
docker compose exec backend npx prisma migrate dev --name init

# Pobla la DB con datos iniciales (países, fields, usuario admin)
docker compose exec backend npx prisma db seed
```

> `migrate dev --name init` crea un archivo en `backend/prisma/migrations/` con el SQL generado y lo aplica a la DB. El nombre `init` es solo una etiqueta descriptiva para esta primera migración.

---

---

### Troubleshooting: `docker compose down` vs `docker compose down -v`

> **`docker compose down`** detiene y elimina los contenedores y las redes, pero **preserva los volúmenes** (`postgres_data`, `minio_data`). La próxima vez que levantes los contenedores, la DB mantiene todos los datos previos.
>
> **`docker compose down -v`** hace lo mismo **más destruir los volúmenes**. La próxima vez que levantes, PostgreSQL arranca con una DB vacía y vuelve a ejecutar la inicialización (crear usuario, base de datos, etc.).
>
> **Cuándo usar `-v`:** Cuando los datos del volumen están corruptos o tienen credenciales de un run anterior que ya no coinciden con las variables de entorno actuales. Es el equivalente a "borrón y cuenta nueva" para la DB.
>
> **Riesgo:** Toda la data existente se pierde. Si ya corriste migrations y seed, tendrás que volver a ejecutarlos.

---

### Troubleshooting: conflicto de puerto 5432

> Si al intentar conectarte a PostgreSQL desde una herramienta externa (TablePlus, pgAdmin, DBeaver, etc.) la conexión falla o se comporta de manera inconsistente, verificá si hay otro proceso escuchando en el mismo puerto:
>
> ```bash
> # Windows
> netstat -ano | findstr :5432
> ```
>
> Si el resultado muestra **dos PIDs distintos** en LISTENING, hay un conflicto. Esto suele ocurrir cuando hay una instalación local de PostgreSQL (no Docker) corriendo como servicio de Windows.
>
> **Solución opción A — detener el servicio local:**
> ```bash
> # Abrir PowerShell como administrador
> Stop-Service -Name "postgresql-x64-XX"
> # O desde services.msc, buscar "PostgreSQL" y detenerlo
> ```
>
> **Solución opción B — cambiar el puerto del contenedor Docker:**
> En `docker-compose.yml`, cambiar el port mapping de postgres:
> ```yaml
> ports:
>   - '5433:5432'  # host:container — el contenedor sigue usando 5432, el host expone en 5433
> ```
> Con esta opción, la conexión desde el host (TablePlus, etc.) usa el puerto 5433 en lugar de 5432. El `DATABASE_URL` del backend **no se cambia** porque el backend se conecta por la red interna de Docker (donde postgres sigue en 5432).
>
> **Importante:** Si elegís opción B, actualizá también cualquier referencia al puerto en las herramientas externas (TablePlus, etc.).

---

### Phase 2 milestone

> **Status: blocked** — pendiente de resolver el conflicto de puerto 5432 para poder verificar los datos con un cliente externo.

Verificar con Prisma Studio o un cliente externo (TablePlus, pgAdmin, DBeaver):

```bash
# Opción A: Prisma Studio (se abre en el browser)
docker compose exec backend npx prisma studio

# Opción B: Cliente externo
# Host: localhost, Port: 5432 (o 5433 si cambiaste el mapping),
# User: recruiting_user, Password: recruiting_pass, Database: recruiting_db
```

- [ ] `users` table has 1 record (admin@recruiting.com)
- [ ] `countries` table has 7 records
- [ ] `fields` table has 7 records
- [ ] All other tables exist and are empty
- [ ] `job_applications` has the unique constraint on (jobDescriptionId, applicantId)
