# Backend API

This service exposes the pricing intelligence API described in the plan, backed by Express, Drizzle ORM, Postgres, and Zod.

## Requirements

- `DATABASE_URL` pointing to Postgres
- `PORT` (optional, defaults to `4000`)

## Quick Start with Docker

The easiest way to get started is using Docker Compose to run PostgreSQL:

```bash
# Start PostgreSQL in Docker
docker-compose up -d

# Verify it's running
docker-compose ps

# The database will be available at:
# Host: localhost
# Port: 5432
# Database: calibrax
# User: calibrax
# Password: calibrax
```

The connection string is already configured in `.env.example`:
```
DATABASE_URL=postgresql://calibrax:calibrax@localhost:5432/calibrax
```

**Docker Commands:**
```bash
# Start database
docker-compose up -d

# Stop database (keeps data)
docker-compose down

# Stop and remove all data (⚠️ destructive)
docker-compose down -v

# View logs
docker-compose logs postgres

# Access PostgreSQL CLI
docker-compose exec postgres psql -U calibrax -d calibrax
```

**Note:** The Docker setup uses a persistent volume, so your data will persist even after stopping the container.

## Database Setup

### Initial Setup

Before running the application, you need to create the database tables. You have two options:

**Option 1: Push schema directly (development)**
```bash
pnpm db:push
```
This will create/update tables directly from your schema without generating migration files.

**Option 2: Generate and run migrations (recommended for production)**
```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:migrate
```

### Database Commands

- `pnpm db:generate` – Generate migration files from schema changes
- `pnpm db:push` – Push schema directly to database (development only)
- `pnpm db:migrate` – Apply pending migrations to database
- `pnpm db:studio` – Open Drizzle Studio (database GUI)

### First Time Setup

1. **Set up PostgreSQL:**
   - Option A: Use Docker (recommended for development)
     ```bash
     docker-compose up -d
     ```
   - Option B: Use an existing PostgreSQL instance
     - Create a database: `createdb calibrax`
     - Update `DATABASE_URL` in `.env`

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env if needed (defaults work with Docker setup)
   ```

3. **Initialize database schema:**
   ```bash
   # Option 1: Push schema directly (development)
   pnpm db:push
   
   # Option 2: Generate and run migrations (recommended)
   pnpm db:generate
   pnpm db:migrate
   ```

## Commands

- `pnpm dev` – run `tsx watch` against `src/index.ts`
- `pnpm build` – compile TypeScript into `dist/`
- `pnpm start` – run the compiled server

Install dependencies using `pnpm install` from `/backend`, which will also populate the lockfile and install the dev dependencies defined in `package.json`.

